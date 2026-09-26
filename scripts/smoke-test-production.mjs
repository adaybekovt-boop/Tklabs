const baseUrl = (process.env.SMOKE_BASE_URL || "https://tklabs.uk").replace(/\/$/, "");
const expectedRelease = process.env.EXPECTED_RELEASE?.trim();
const attempts = Number.parseInt(process.env.SMOKE_ATTEMPTS || "8", 10);
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "5000", 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "cache-control": "no-cache", "x-tklabs-smoke": "production" },
      signal: controller.signal,
      redirect: "error",
    });
    const body = await response.json().catch(() => null);
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function verify() {
  const readiness = await fetchJson(`/api/ready?smoke=${Date.now()}`);
  if (!readiness.response.ok || !readiness.body?.ok) {
    throw new Error(`readiness_failed:${readiness.response.status}`);
  }
  if (expectedRelease && readiness.body.release !== expectedRelease) {
    throw new Error(`release_mismatch:${readiness.body.release || "missing"}`);
  }

  const providers = await fetchJson("/api/auth/providers");
  const google = providers.body?.google;
  if (!providers.response.ok || google?.callbackUrl !== `${baseUrl}/api/auth/callback/google`)
    throw new Error("auth_provider_configuration_failed");
  const csrf = await fetchJson("/api/auth/csrf");
  if (!csrf.response.ok || typeof csrf.body?.csrfToken !== "string" || !csrf.body.csrfToken)
    throw new Error("auth_csrf_failed");

  const manifest = await fetchJson(`/manifest.webmanifest?smoke=${Date.now()}`);
  if (!manifest.response.ok || !manifest.body?.name)
    throw new Error(`manifest_failed:${manifest.response.status}`);

  return readiness.body;
}

let lastError;
for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
  try {
    const readiness = await verify();
    console.log(JSON.stringify({
      ok: true,
      baseUrl,
      release: readiness.release,
      attempt,
      checks: readiness.checks,
    }));
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.warn(`Smoke attempt ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : "unknown"}`);
    if (attempt < attempts) await sleep(Math.min(12_000, 1_000 * (2 ** (attempt - 1))));
  }
}

console.error(JSON.stringify({
  ok: false,
  baseUrl,
  expectedRelease: expectedRelease || null,
  error: lastError instanceof Error ? lastError.message : "unknown",
}));
process.exit(1);
