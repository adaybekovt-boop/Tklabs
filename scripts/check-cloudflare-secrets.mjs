import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REQUIRED_RUNTIME_SECRETS = [
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "RATE_LIMIT_SECRET",
  "ACCOUNT_ID_SECRET",
  "TERMS_USER_ID_SECRET",
  "NVIDIA_API_KEY_PRIMARY",
];

export const CLODEX_RUNTIME_SECRETS = ["CLODEX_API_KEY", "CLODEX_ACCESS_CODE"];
export const ELEVENLABS_RUNTIME_SECRETS = ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"];

export function buildSecretListArgs(config) {
  return ["wrangler", "secret", "list", "--config", config, "--format", "json"];
}

export function parseSecretNames(output) {
  let entries;
  try {
    entries = JSON.parse(output);
  } catch {
    throw new Error("Cloudflare secret list returned malformed JSON.");
  }
  if (!Array.isArray(entries)) throw new Error("Cloudflare secret list returned an unexpected response.");
  return new Set(entries.filter((entry) => entry && typeof entry.name === "string").map((entry) => entry.name.trim()).filter(Boolean));
}

/** @param {Record<string, string | undefined>} [env] */
export function requiredSecretNames(env = process.env) {
  const required = [...REQUIRED_RUNTIME_SECRETS];
  if (env.CLODEX_ENABLED?.trim().toLowerCase() === "true") required.push(...CLODEX_RUNTIME_SECRETS);
  return required;
}

/** @param {Set<string>} names @param {Record<string, string | undefined>} [env] */
export function missingSecretNames(names, env = process.env) {
  const required = requiredSecretNames(env);
  const missing = required.filter((name) => !names.has(name));
  const elevenLabsConfigured = ELEVENLABS_RUNTIME_SECRETS.some((name) => names.has(name));
  if (elevenLabsConfigured) missing.push(...ELEVENLABS_RUNTIME_SECRETS.filter((name) => !names.has(name)));
  return [...new Set(missing)];
}

/**
 * @param {{ config: string, root: string, run?: (file: string, args: readonly string[], options: { cwd: string, env: NodeJS.ProcessEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) => string }} options
 */
export function readCloudflareSecretNames({ config, root, run = execFileSync }) {
  const output = run("npx", buildSecretListArgs(config), {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return parseSecretNames(output);
}

/** @param {Set<string>} names @param {Record<string, string | undefined>} [env] */
export function validateCloudflareSecretNames(names, env = process.env) {
  const missing = missingSecretNames(names, env);
  if (missing.length) throw new Error(`Missing Cloudflare runtime secret names: ${missing.join(", ")}`);
}

export function safePreflightError(error) {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "unknown";
  const status = error && typeof error === "object" && "status" in error && Number.isInteger(error.status) ? ` status=${error.status}` : "";
  const stderr = error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
  const message = error instanceof Error ? error.message : "";
  const detail = `${stderr} ${message}`
    .replace(/(authorization\s*[:=]\s*(?:bearer\s+)?|api[_ -]?token\s*[:=]\s*)\S+/gi, "$1[redacted]")
    .replace(/("?(?:value|secret|token|api[_ -]?key)"?\s*[:=]\s*"?)[^,}\s"]+("?)/gi, "$1[redacted]$2")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
  return detail
    ? `Cloudflare runtime secret preflight failed (${code}${status}): ${detail}`
    : `Cloudflare runtime secret preflight failed (${code}${status}).`;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const config = process.env.WRANGLER_CONFIG?.trim() || join(root, "dist/server/wrangler.json");
  try {
    const names = readCloudflareSecretNames({ config, root });
    validateCloudflareSecretNames(names);
    console.log("Cloudflare runtime secret names validated.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error(message.startsWith("Missing Cloudflare runtime secret names:") ? message : safePreflightError(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
