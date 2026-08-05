import vinext from "vinext";
import { defineConfig } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
// D1 database IDs are routing identifiers, not credentials. Keep the production
// ID in the build fallback so Cloudflare's Git integration also emits the DB
// binding; CI may still override it for another environment.
const DEFAULT_D1_DATABASE_ID = "c4085a86-0fec-49f2-b2ed-5999190fcc30";
const d1DatabaseId = process.env.D1_DATABASE_ID?.trim() || DEFAULT_D1_DATABASE_ID;
const clodexEnabled = process.env.CLODEX_ENABLED?.trim().toLowerCase() === "true";
const clodexGrantTtlDays = process.env.CLODEX_GRANT_TTL_DAYS?.trim() || "30";
const clodexGrantVersion = process.env.CLODEX_GRANT_VERSION?.trim() || "v2";
const configuredAuthUrl = process.env.AUTH_URL?.trim();
const authTrustHost = process.env.AUTH_TRUST_HOST?.trim() || "true";

const localWorkerConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  durable_objects: {
    bindings: [
      { name: "CLODEX_ACCESS", class_name: "ClodexAccess" },
      { name: "HEALTH_STATUS", class_name: "HealthStatus" },
    ],
  },
  migrations: [
    { tag: "v1", new_sqlite_classes: ["ClodexAccess"] },
    { tag: "v2", new_sqlite_classes: ["HealthStatus"] },
  ],
  workers_dev: true,
  vars: {
    // Only inject AUTH_URL when it was explicitly configured. If it is absent,
    // Auth.js derives the origin from the forwarded request host, which keeps
    // local development on localhost without baking localhost into production.
    ...(configuredAuthUrl ? { AUTH_URL: configuredAuthUrl } : {}),
    AUTH_TRUST_HOST: authTrustHost,
    CLODEX_ENABLED: clodexEnabled ? "true" : "false",
    CLODEX_GRANT_TTL_DAYS: clodexGrantTtlDays,
    CLODEX_GRANT_VERSION: clodexGrantVersion,
    TTS_REQUEST_LIMIT: process.env.TTS_REQUEST_LIMIT?.trim() || "5",
    TTS_DAILY_CHARACTER_QUOTA: process.env.TTS_DAILY_CHARACTER_QUOTA?.trim() || "10000",
    TTS_PRIVILEGED_REQUEST_LIMIT: process.env.TTS_PRIVILEGED_REQUEST_LIMIT?.trim() || "30",
    TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA: process.env.TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA?.trim() || "100000",
  },
  ...(d1DatabaseId ? {
    // The generated Wrangler config lives in dist/server, so this path points
    // back to the repository migration directory for `d1 migrations apply`.
    d1_databases: [{ binding: "DB", database_name: "tklabs", database_id: d1DatabaseId, migrations_dir: "../../drizzle" }],
  } : {}),
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localWorkerConfig,
      }),
    ],
  };
});
