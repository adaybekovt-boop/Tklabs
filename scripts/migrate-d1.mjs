import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MIGRATION_NAME = /^\d+_[A-Za-z0-9][A-Za-z0-9._-]*\.sql$/;
const TRANSACTION_STATEMENT = /\b(?:BEGIN(?:\s+TRANSACTION)?|COMMIT|ROLLBACK)\b/i;

export function getMigrationFiles(entries) {
  const sqlFiles = entries.filter((entry) => entry.endsWith(".sql"));
  const invalid = sqlFiles.filter((entry) => !MIGRATION_NAME.test(entry));
  if (invalid.length) throw new Error(`Invalid D1 migration filename: ${invalid.join(", ")}`);
  return sqlFiles.filter((entry) => MIGRATION_NAME.test(entry)).sort();
}

export function validateMigrationSql(contents) {
  const incompatible = contents.filter(({ sql }) => TRANSACTION_STATEMENT.test(sql)).map(({ name }) => name);
  if (incompatible.length) throw new Error(`D1 migrations must not contain transaction statements: ${incompatible.join(", ")}`);
}

export function buildD1MigrationsArgs(database, config) {
  return ["wrangler", "d1", "migrations", "apply", database, "--remote", "--config", config];
}

/**
 * @param {{ database: string, config: string, root: string, run?: (file: string, args: readonly string[], options: { cwd: string, stdio: "inherit", env: NodeJS.ProcessEnv }) => unknown }} options
 */
export function runD1Migrations({ database, config, root, run = execFileSync }) {
  const args = buildD1MigrationsArgs(database, config);
  return run("npx", args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const database = process.env.D1_DATABASE_NAME?.trim() || "tklabs";
  const config = process.env.WRANGLER_CONFIG?.trim() || join(root, "dist/server/wrangler.json");
  const migrationDir = join(root, "drizzle");
  const migrations = getMigrationFiles(readdirSync(migrationDir));
  if (!migrations.length) throw new Error("No D1 migrations found in drizzle/.");
  validateMigrationSql(migrations.map((name) => ({ name, sql: readFileSync(join(migrationDir, name), "utf8") })));

  // Wrangler owns both pending-migration detection and its d1_migrations
  // ledger. The command applies each migration and appends its ledger row in
  // the same D1 execution, rolling back the migration when either fails.
  runD1Migrations({ database, config, root });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
