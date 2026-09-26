import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Miniflare, Response, FormData } from "miniflare";

// Runs the built production Worker in an isolated workerd instance. Every
// outbound request is intercepted; these credentials never contact Google.
const baseUrl = "https://auth-worker.test";
const clientId = "worker-fixture.apps.googleusercontent.com";
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
let challenge;
let exchanges = 0;

async function mockGoogle(request) {
  if (request.url === "https://accounts.google.com/.well-known/openid-configuration") {
    return Response.json({
      issuer: "https://accounts.google.com",
      authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      token_endpoint: "https://oauth2.googleapis.com/token",
      userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
      jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      code_challenge_methods_supported: ["S256"],
    });
  }
  assert.equal(request.url, "https://oauth2.googleapis.com/token", "Unexpected outbound request");
  exchanges += 1;
  const body = new URLSearchParams(await request.text());
  assert.equal(body.get("redirect_uri"), `${baseUrl}/api/auth/callback/google`);
  assert.equal(createHash("sha256").update(body.get("code_verifier")).digest("base64url"), challenge);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    { alg: "RS256" },
    { email: "member@example.com", email_verified: true, name: "Member", sub: "fixture-subject",
      iss: "https://accounts.google.com", aud: clientId, iat: now, exp: now + 300 },
  ].map((part) => Buffer.from(JSON.stringify(part)).toString("base64url")).join(".");
  const idToken = `${unsigned}.${sign("sha256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
  return Response.json({ access_token: "fixture-access", token_type: "Bearer", expires_in: 300, id_token: idToken });
}

const serverRoot = resolve("dist/server");
const buildConfig = JSON.parse(await readFile(resolve(serverRoot, "wrangler.json"), "utf8"));
// Explicit modules cover Vinext's lazy SSR imports; no generated source edits.
const paths = (await readdir(serverRoot, { recursive: true }))
  .filter((path) => path.endsWith(".js") || path.endsWith(".mjs"))
  .sort((a, b) => a === "index.js" ? -1 : b === "index.js" ? 1 : a.localeCompare(b));
const worker = new Miniflare({
  modules: paths.map((path) => ({ type: "ESModule", path: resolve(serverRoot, path) })),
  modulesRoot: serverRoot,
  compatibilityDate: buildConfig.compatibility_date,
  compatibilityFlags: buildConfig.compatibility_flags,
  bindings: {
    AUTH_SECRET: "local-worker-auth-test-fixture-secret-only",
    AUTH_GOOGLE_ID: clientId,
    AUTH_GOOGLE_SECRET: "local-worker-google-test-fixture",
    AUTH_URL: baseUrl,
    AUTH_TRUST_HOST: "true",
  },
  durableObjects: {
    CLODEX_ACCESS: { className: "ClodexAccess", useSQLite: true },
    HEALTH_STATUS: { className: "HealthStatus", useSQLite: true },
    INFERENCE_SCHEDULER: { className: "InferenceScheduler", useSQLite: true },
  },
  d1Databases: ["DB"],
  outboundService: mockGoogle,
});

const cookies = new Map();
function saveCookies(response) {
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";")[0];
    const index = pair.indexOf("=");
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
}
const cookieHeader = () => Array.from(cookies, ([key, value]) => `${key}=${value}`).join("; ");

try {
  const page = await worker.dispatchFetch(`${baseUrl}/login`);
  assert.equal(page.status, 200);
  saveCookies(page);
  const html = await page.text();
  const action = html.match(/name="(\$ACTION_ID_[^"]+)"/);
  assert.ok(action, "Built login form must expose its native server action");

  const form = new FormData();
  form.append(action[1], "");
  const start = await worker.dispatchFetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { origin: baseUrl, cookie: cookieHeader() },
    body: form,
    redirect: "manual",
  });
  assert.equal(start.status, 303);
  const authorization = new URL(start.headers.get("location"));
  assert.equal(authorization.origin, "https://accounts.google.com");
  assert.equal(authorization.searchParams.get("redirect_uri"), `${baseUrl}/api/auth/callback/google`);
  challenge = authorization.searchParams.get("code_challenge");
  assert.ok(challenge);
  saveCookies(start);
  assert.ok(cookies.has("__Secure-authjs.pkce.code_verifier"), "Server action must propagate PKCE Set-Cookie");

  const callback = await worker.dispatchFetch(`${baseUrl}/api/auth/callback/google?code=fixture-code`, {
    headers: { cookie: cookieHeader() }, redirect: "manual",
  });
  assert.equal(callback.status, 302);
  assert.equal(callback.headers.get("location"), `${baseUrl}/playground`);
  assert.equal(exchanges, 1);
  saveCookies(callback);
  assert.equal(cookies.has("__Secure-authjs.pkce.code_verifier"), false);
  const session = await worker.dispatchFetch(`${baseUrl}/api/auth/session`, { headers: { cookie: cookieHeader() } });
  assert.equal((await session.json()).user.email, "member@example.com");

  // Exercise nextAuth.auth() in an RSC page too, not just the core HTTP route.
  const signedInPage = await worker.dispatchFetch(`${baseUrl}/login`, {
    headers: { cookie: cookieHeader() }, redirect: "manual",
  });
  assert.equal(signedInPage.status, 307);
  assert.equal(new URL(signedInPage.headers.get("location"), baseUrl).pathname, "/playground");

  const alias = await worker.dispatchFetch("https://alias-worker.test/login", { redirect: "manual" });
  assert.equal(alias.status, 307);
  assert.equal(alias.headers.get("location"), `${baseUrl}/login`);

  // The old NextRequest rewrite also discarded HTTP POST methods/bodies.
  const csrf = await worker.dispatchFetch(`${baseUrl}/api/auth/csrf`, { headers: { cookie: cookieHeader() } });
  saveCookies(csrf);
  const { csrfToken } = await csrf.json();
  const signOut = await worker.dispatchFetch(`${baseUrl}/api/auth/signout`, {
    method: "POST",
    headers: { cookie: cookieHeader(), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/login" }).toString(),
    redirect: "manual",
  });
  assert.equal(signOut.status, 302);
  assert.equal(signOut.headers.get("location"), `${baseUrl}/login`);
  saveCookies(signOut);
  const signedOut = await worker.dispatchFetch(`${baseUrl}/api/auth/session`, { headers: { cookie: cookieHeader() } });
  assert.equal(await signedOut.json(), null);
  console.log("Built Worker OAuth: server action, PKCE callback, HTTP/RSC session, canonical origin and CSRF sign-out passed.");
} finally {
  await worker.dispose();
}
