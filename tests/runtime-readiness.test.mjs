import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const bindings = {};
globalThis.__tklabsCloudflareEnv = bindings;
const { GET } = await import("../app/api/ready/route.ts");

test("readiness rejects missing auth or scheduler configuration without exposing values", async () => {
  const original = { ...process.env };
  try {
    Object.assign(process.env, {
      NODE_ENV: "production", AUTH_URL: "https://tklabs.uk", AUTH_TRUST_HOST: "true",
      AUTH_SECRET: "fixture-session-secret", AUTH_GOOGLE_ID: "fixture-client-id",
      AUTH_GOOGLE_SECRET: "fixture-google-secret", ERMA_PROVIDER_MESH_ENABLED: "true",
    });
    Object.assign(bindings, { DB: {}, CLODEX_ACCESS: {}, HEALTH_STATUS: {}, INFERENCE_SCHEDULER: {} });
    let response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.checks.authentication, true);
    assert.doesNotMatch(JSON.stringify(body), /fixture-/);

    delete process.env.AUTH_GOOGLE_SECRET;
    response = await GET();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).checks.authentication, false);

    process.env.AUTH_GOOGLE_SECRET = "fixture-google-secret";
    delete bindings.INFERENCE_SCHEDULER;
    assert.equal((await GET()).status, 503);
    process.env.ERMA_PROVIDER_MESH_ENABLED = " FALSE ";
    assert.equal((await GET()).status, 200);

    process.env.AUTH_URL = "https://tklabs.uk/unexpected-path";
    assert.equal((await GET()).status, 503);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
    for (const key of Object.keys(bindings)) delete bindings[key];
  }
});

function runSmoke(mode) {
  const fixture = `
    globalThis.fetch = async (input, init) => {
      const path = new URL(input).pathname;
      if (init.redirect !== 'error') throw new Error('redirect_guard_missing');
      if (path === '/api/ready') return Response.json({ok:true,release:'fixture',checks:{}});
      if (path === '/api/auth/providers') return Response.json({google:{callbackUrl:${JSON.stringify(mode === "wrong-origin" ? "https://wrong.example/api/auth/callback/google" : "https://tklabs.uk/api/auth/callback/google")}}});
      if (path === '/api/auth/csrf') return Response.json({csrfToken:'fixture-token'});
      if (path === '/manifest.webmanifest') {
        if (${JSON.stringify(mode)} === 'manifest-timeout') return new Promise((resolve,reject) => init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true}));
        return Response.json({name:'TK LAB'});
      }
      throw new Error('unexpected_endpoint');
    };
  `;
  return spawnSync(process.execPath, ["--import", `data:text/javascript,${encodeURIComponent(fixture)}`, new URL("../scripts/smoke-test-production.mjs", import.meta.url).pathname], {
    encoding: "utf8", timeout: 5000,
    env: { ...process.env, SMOKE_BASE_URL: "https://tklabs.uk", EXPECTED_RELEASE: "fixture", SMOKE_ATTEMPTS: "1", SMOKE_TIMEOUT_MS: "30" },
  });
}

test("production smoke checks auth origin and bounds the manifest request", () => {
  assert.equal(runSmoke("success").status, 0);
  const wrong = runSmoke("wrong-origin");
  assert.equal(wrong.status, 1);
  assert.match(wrong.stderr, /auth_provider_configuration_failed/);
  const timeout = runSmoke("manifest-timeout");
  assert.equal(timeout.status, 1);
  assert.equal(timeout.signal, null);
});
