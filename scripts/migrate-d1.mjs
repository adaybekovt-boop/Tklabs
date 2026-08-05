import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const database = process.env.D1_DATABASE_NAME?.trim() || "tklabs";
const config = process.env.WRANGLER_CONFIG?.trim() || join(root, "dist/server/wrangler.json");
const migrationDir = join(root, "drizzle");
const migrations = readdirSync(migrationDir)
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

if (!migrations.length) throw new Error("No D1 migrations found in drizzle/.");

function wrangler(args) {
  execFileSync("npx", ["wrangler", "d1", "execute", database, ...args, "--config", config], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}

wrangler(["--remote", "--command", "CREATE TABLE IF NOT EXISTS _tklabs_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)"]);

for (const migration of migrations) {
  // Migration files in this repository use CREATE/INDEX IF NOT EXISTS. Running
  // all ordered files is deliberately idempotent and also repairs a database
  // that predates the migration ledger without destructive introspection.
  wrangler(["--remote", "--file", join(migrationDir, migration)]);
  wrangler(["--remote", "--command", `INSERT OR IGNORE INTO _tklabs_migrations (name, applied_at) VALUES ('${basename(migration)}', ${Date.now()})`]);
}
