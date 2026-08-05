import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MIGRATION_NAME = /^\d+_[A-Za-z0-9][A-Za-z0-9._-]*\.sql$/;

export function getMigrationFiles(entries) {
  const sqlFiles = entries.filter((entry) => entry.endsWith(".sql"));
  const invalid = sqlFiles.filter((entry) => !MIGRATION_NAME.test(entry));
  if (invalid.length) throw new Error(`Invalid D1 migration filename: ${invalid.join(", ")}`);
  return sqlFiles.filter((entry) => MIGRATION_NAME.test(entry)).sort();
}

function walk(value, names) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, names);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if ((key === "name" || key === "migration" || key === "migration_name") && typeof item === "string") names.add(item);
    else walk(item, names);
  }
}

export function parseAppliedMigrationNames(output) {
  const trimmed = output.trim();
  if (!trimmed) return new Set();
  const candidates = [trimmed];
  const start = trimmed.search(/[\[{]/);
  const end = Math.max(trimmed.lastIndexOf("]"), trimmed.lastIndexOf("}"));
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const names = new Set();
      walk(parsed, names);
      return names;
    } catch {
      // Wrangler may prefix JSON with human-readable progress lines.
    }
  }
  throw new Error("Unable to parse the D1 migration ledger response.");
}

export function pendingMigrations(allMigrations, appliedNames) {
  return allMigrations.filter((migration) => !appliedNames.has(migration));
}

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const database = process.env.D1_DATABASE_NAME?.trim() || "tklabs";
  const config = process.env.WRANGLER_CONFIG?.trim() || join(root, "dist/server/wrangler.json");
  const migrationDir = join(root, "drizzle");
  const migrations = getMigrationFiles(readdirSync(migrationDir));
  if (!migrations.length) throw new Error("No D1 migrations found in drizzle/.");

  function wrangler(args, capture = false) {
    return execFileSync("npx", ["wrangler", "d1", "execute", database, ...args, "--config", config], {
      cwd: root,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
      env: process.env,
      encoding: capture ? "utf8" : undefined,
    });
  }

  wrangler(["--remote", "--command", "CREATE TABLE IF NOT EXISTS _tklabs_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)"]);
  const ledgerOutput = wrangler(["--remote", "--json", "--command", "SELECT name FROM _tklabs_migrations ORDER BY name"], true);
  const pending = pendingMigrations(migrations, parseAppliedMigrationNames(ledgerOutput));

  for (const migration of pending) {
    wrangler(["--remote", "--file", join(migrationDir, migration)]);
    // Record only after the migration succeeds. A failed file remains pending
    // and is retried on the next deploy.
    wrangler(["--remote", "--command", `INSERT OR IGNORE INTO _tklabs_migrations (name, applied_at) VALUES (${sqlLiteral(basename(migration))}, ${Date.now()})`]);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
