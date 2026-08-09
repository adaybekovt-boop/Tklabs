#!/usr/bin/env node

const rawTarget = process.env.ERMA_LOAD_TEST_URL?.trim();
const confirmation = process.env.ERMA_LOAD_TEST_CONFIRM?.trim();
const allowProduction = process.env.ERMA_LOAD_TEST_ALLOW_PRODUCTION?.trim().toLowerCase() === "true";

if (!rawTarget) {
  console.error("ERMA_LOAD_TEST_URL is required. Point it at an explicit preview/staging deployment.");
  process.exit(2);
}
if (confirmation !== "I_UNDERSTAND") {
  console.error("Set ERMA_LOAD_TEST_CONFIRM=I_UNDERSTAND to acknowledge that this creates real inference traffic.");
  process.exit(2);
}

const target = new URL("/api/demo", rawTarget);
const productionHosts = new Set(["tklabs.uk", "www.tklabs.uk"]);
if (productionHosts.has(target.hostname.toLowerCase()) && !allowProduction) {
  console.error("Production load tests are blocked by default. Use a preview/staging URL or explicitly set ERMA_LOAD_TEST_ALLOW_PRODUCTION=true.");
  process.exit(2);
}

function boundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

const total = boundedInt(process.env.ERMA_LOAD_TEST_REQUESTS, 100, 1, 5_000);
const concurrency = boundedInt(process.env.ERMA_LOAD_TEST_CONCURRENCY, Math.min(100, total), 1, Math.min(1_000, total));
const timeoutMs = boundedInt(process.env.ERMA_LOAD_TEST_TIMEOUT_MS, 45_000, 1_000, 180_000);
const model = process.env.ERMA_LOAD_TEST_MODEL?.trim() || "erma-spark-lite";
const locale = process.env.ERMA_LOAD_TEST_LOCALE?.trim() === "en" ? "en" : "ru";
const cookie = process.env.ERMA_LOAD_TEST_COOKIE?.trim() || "";
const bearer = process.env.ERMA_LOAD_TEST_BEARER?.trim() || "";
const maxFailureRate = Math.min(1, Math.max(0, Number.parseFloat(process.env.ERMA_LOAD_TEST_MAX_FAILURE_RATE ?? "0.05") || 0.05));

const latencies = [];
const statuses = new Map();
const providers = new Map();
const models = new Map();
const fallbackReasons = new Map();
let failures = 0;
let cursor = 0;

function increment(map, key) {
  const normalized = key || "unknown";
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function one(index) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("load_test_timeout")), timeoutMs);
  const startedAt = performance.now();
  try {
    const response = await fetch(target, {
      method: "POST",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({
        prompt: locale === "ru"
          ? `Нагрузочная проверка Erma #${index + 1}. Ответь одним словом: готова.`
          : `Erma load check #${index + 1}. Reply with one word: ready.`,
        locale,
        model,
        reasonEnabled: false,
        effort: "low",
        tone: "professional",
      }),
    });
    const latency = Math.round(performance.now() - startedAt);
    latencies.push(latency);
    increment(statuses, String(response.status));
    const payload = await response.json().catch(() => null);
    if (payload?.meta) {
      increment(providers, payload.meta.actualProvider);
      increment(models, payload.meta.actualModel);
      if (payload.meta.fallbackReason) increment(fallbackReasons, payload.meta.fallbackReason);
    }
    if (!response.ok || !payload?.answer) failures += 1;
  } catch (error) {
    latencies.push(Math.round(performance.now() - startedAt));
    failures += 1;
    increment(statuses, error instanceof Error && error.name === "AbortError" ? "timeout" : "network-error");
  } finally {
    clearTimeout(timeout);
  }
}

async function worker() {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= total) return;
    await one(index);
  }
}

console.log(JSON.stringify({
  event: "erma_load_test_start",
  target: target.origin,
  requests: total,
  concurrency,
  model,
  timeoutMs,
}, null, 2));

const wallStartedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const wallMs = Math.round(performance.now() - wallStartedAt);
const success = total - failures;
const failureRate = failures / total;

const result = {
  event: "erma_load_test_result",
  target: target.origin,
  requests: total,
  concurrency,
  success,
  failures,
  failureRate: Number(failureRate.toFixed(4)),
  wallMs,
  throughputRps: Number((total / Math.max(0.001, wallMs / 1_000)).toFixed(2)),
  latencyMs: {
    min: latencies.length ? Math.min(...latencies) : null,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies.length ? Math.max(...latencies) : null,
  },
  statuses: Object.fromEntries([...statuses.entries()].sort()),
  providers: Object.fromEntries([...providers.entries()].sort()),
  models: Object.fromEntries([...models.entries()].sort()),
  fallbackReasons: Object.fromEntries([...fallbackReasons.entries()].sort()),
};

console.log(JSON.stringify(result, null, 2));
if (failureRate > maxFailureRate) process.exitCode = 1;
