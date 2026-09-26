import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { Auth, customFetch } from "@auth/core";

import { getAuthConfig, getAuthConfigurationIssues, getConfiguredAuthOrigin } from "../lib/auth-config.ts";
import { getAuthCanonicalRedirect, withTrustedForwardedHeaders } from "../lib/auth-origin.ts";

const environment = {
  NODE_ENV: "production",
  AUTH_SECRET: "oauth-runtime-fixture-secret-longer-than-32-characters",
  AUTH_GOOGLE_ID: "test-client.apps.googleusercontent.com",
  AUTH_GOOGLE_SECRET: "oauth-provider-fixture-secret",
  AUTH_URL: "https://tklabs.uk",
  AUTH_TRUST_HOST: "true",
};

function applyCookies(jar, response) {
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const index = pair.indexOf("=");
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (value) jar.set(name, value);
    else jar.delete(name);
  }
}

function cookieHeader(jar) {
  return Array.from(jar, ([name, value]) => `${name}=${value}`).join("; ");
}

async function oauthFixture({ verified = true } = {}) {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const errors = [];
  let challenge;
  let exchanges = 0;
  const mockGoogle = async (input, init) => {
    const url = String(input);
    if (url === "https://accounts.google.com/.well-known/openid-configuration") {
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
    assert.equal(url, "https://oauth2.googleapis.com/token");
    exchanges += 1;
    const body = new URLSearchParams(init.body);
    assert.equal(body.get("redirect_uri"), "https://tklabs.uk/api/auth/callback/google");
    assert.equal(createHash("sha256").update(body.get("code_verifier")).digest("base64url"), challenge);
    const now = Math.floor(Date.now() / 1000);
    const unsigned = [
      { alg: "RS256" },
      { email: "member@example.com", email_verified: verified, name: "Member", sub: "google-subject-123",
        iss: "https://accounts.google.com", aud: environment.AUTH_GOOGLE_ID, iat: now, exp: now + 300 },
    ].map((part) => Buffer.from(JSON.stringify(part)).toString("base64url")).join(".");
    const idToken = `${unsigned}.${sign("sha256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
    return Response.json({ access_token: "fixture-access-token", token_type: "Bearer", expires_in: 300, id_token: idToken });
  };

  // Each call creates the configuration separately, as RSC actions and the
  // callback do in the Worker. No secret/config object is shared by the calls.
  const config = () => {
    const value = getAuthConfig(environment);
    value.providers[0].options[customFetch] = mockGoogle;
    value.logger = { error: (error) => errors.push(error.type), warn() {}, debug() {} };
    return value;
  };
  const jar = new Map();
  const csrf = await Auth(new Request(`${environment.AUTH_URL}/api/auth/csrf`), config());
  assert.equal(csrf.status, 200);
  applyCookies(jar, csrf);
  const { csrfToken } = await csrf.json();
  const start = await Auth(new Request(`${environment.AUTH_URL}/api/auth/signin/google`, {
    method: "POST",
    headers: { cookie: cookieHeader(jar), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/playground" }),
  }), config());
  assert.equal(start.status, 302);
  const authorization = new URL(start.headers.get("location"));
  assert.equal(authorization.origin, "https://accounts.google.com");
  assert.equal(authorization.searchParams.get("redirect_uri"), "https://tklabs.uk/api/auth/callback/google");
  assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
  challenge = authorization.searchParams.get("code_challenge");
  assert.ok(challenge);
  const pkce = start.headers.getSetCookie().find((cookie) => cookie.startsWith("__Secure-authjs.pkce.code_verifier="));
  assert.match(pkce, /HttpOnly/);
  assert.match(pkce, /Secure/);
  assert.match(pkce, /SameSite=Lax/);
  assert.doesNotMatch(pkce, /Domain=/i);
  applyCookies(jar, start);
  return {
    jar, config, errors,
    get exchanges() { return exchanges; },
    callback: () => Auth(new Request(`${environment.AUTH_URL}/api/auth/callback/google?code=fixture-code`, {
      headers: { cookie: cookieHeader(jar) },
    }), config()),
  };
}

test("Google PKCE cookie survives independent signin/callback configs and issues a readable session", async () => {
  const fixture = await oauthFixture();
  const callback = await fixture.callback();
  assert.equal(callback.status, 302);
  assert.equal(callback.headers.get("location"), "https://tklabs.uk/playground");
  assert.equal(fixture.exchanges, 1);
  assert.deepEqual(fixture.errors, []);
  applyCookies(fixture.jar, callback);
  assert.equal(fixture.jar.has("__Secure-authjs.pkce.code_verifier"), false);
  const session = await Auth(new Request(`${environment.AUTH_URL}/api/auth/session`, {
    headers: { cookie: cookieHeader(fixture.jar) },
  }), fixture.config());
  assert.equal((await session.json()).user.email, "member@example.com");
});

test("missing PKCE fails closed before token exchange", async () => {
  const fixture = await oauthFixture();
  fixture.jar.delete("__Secure-authjs.pkce.code_verifier");
  const callback = await fixture.callback();
  assert.ok(new URL(callback.headers.get("location")).searchParams.has("error"));
  assert.equal(fixture.exchanges, 0);
  assert.ok(fixture.errors.includes("InvalidCheck"));
  assert.ok(callback.headers.getSetCookie().every((cookie) => !cookie.startsWith("__Secure-authjs.session-token=")));
});

test("an unverified Google email cannot become an account or privileged session", async () => {
  const fixture = await oauthFixture({ verified: false });
  const callback = await fixture.callback();
  assert.equal(new URL(callback.headers.get("location")).searchParams.get("error"), "AccessDenied");
  assert.equal(fixture.exchanges, 1);
  assert.ok(callback.headers.getSetCookie().every((cookie) => !cookie.startsWith("__Secure-authjs.session-token=")));
});

test("auth reads late runtime bindings and never trusts a false string", () => {
  const previous = { ...process.env };
  try {
    process.env.AUTH_SECRET = "late-bound-secret";
    process.env.AUTH_GOOGLE_ID = "late-bound-client";
    assert.equal(getAuthConfig().secret, "late-bound-secret");
    assert.equal(getAuthConfig().providers[0].options.clientId, "late-bound-client");
    process.env.AUTH_SECRET = "rotated-secret";
    assert.equal(getAuthConfig().secret, "rotated-secret");
    assert.equal(getAuthConfig({ ...environment, AUTH_TRUST_HOST: "false" }).trustHost, false);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test("readiness distinguishes valid auth configuration from missing or unsafe origins", () => {
  assert.deepEqual(getAuthConfigurationIssues(environment), []);
  assert.deepEqual(getAuthConfigurationIssues({ NODE_ENV: "production" }), ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_URL", "AUTH_TRUST_HOST"]);
  for (const url of ["http://tklabs.uk", "https://user:pass@tklabs.uk", "https://tklabs.uk/other", "https://tklabs.uk?x=1", "not-a-url"]) {
    assert.equal(getConfiguredAuthOrigin({ ...environment, AUTH_URL: url }), null);
    assert.deepEqual(getAuthConfigurationIssues({ ...environment, AUTH_URL: url }), ["AUTH_URL"]);
  }
  assert.equal(getConfiguredAuthOrigin({ NODE_ENV: "development", AUTH_URL: "http://localhost:3000" }), "http://localhost:3000");
});

test("alternate-host login redirects before host-only PKCE cookies can be created", () => {
  const redirect = getAuthCanonicalRedirect(new Request("https://tkai.example.workers.dev/login?callbackUrl=%2Fplayground"), environment);
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get("location"), "https://tklabs.uk/login?callbackUrl=%2Fplayground");
  assert.match(redirect.headers.get("cache-control"), /no-store/);
  assert.equal(redirect.headers.get("set-cookie"), null);
  assert.equal(getAuthCanonicalRedirect(new Request("https://tklabs.uk/login"), environment), null);
  assert.equal(getAuthCanonicalRedirect(new Request("https://tkai.example.workers.dev/api/ready"), environment), null);
  const post = getAuthCanonicalRedirect(new Request("https://tkai.example.workers.dev/login", { method: "POST", body: "action" }), environment);
  assert.equal(post.status, 303);
  assert.equal(post.headers.get("location"), "https://tklabs.uk/login");
});

test("Worker URL overrides spoofed forwarded headers without losing the request body", async () => {
  const request = withTrustedForwardedHeaders(new Request("https://tklabs.uk/login", {
    method: "POST", body: "preserved-action-body",
    headers: { host: "evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "http", cookie: "session=retained" },
  }));
  assert.equal(request.headers.get("host"), "tklabs.uk");
  assert.equal(request.headers.get("x-forwarded-host"), "tklabs.uk");
  assert.equal(request.headers.get("x-forwarded-proto"), "https");
  assert.equal(request.headers.get("cookie"), "session=retained");
  assert.equal(await request.text(), "preserved-action-body");
});
