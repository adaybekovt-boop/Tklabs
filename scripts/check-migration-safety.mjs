import { readdir, readFile } from "node:fs/promises";

const files = (await readdir("drizzle")).filter((file) => file.endsWith(".sql")).sort();
const destructive = /\b(?:DROP\s+(?:TABLE|COLUMN)|ALTER\s+TABLE[\s\S]{0,120}\bDROP\b|TRUNCATE\b|DELETE\s+FROM\s+[^;]+;)\b/i;
const violations = [];

for (const file of files) {
  const sql = await readFile(`drizzle/${file}`, "utf8");
  if (destructive.test(sql) && !sql.includes("TKLABS_DESTRUCTIVE_MIGRATION_REVIEWED")) {
    violations.push(file);
  }
}

if (violations.length) {
  console.error("Destructive migrations require TKLABS_DESTRUCTIVE_MIGRATION_REVIEWED and an explicit rollback plan:");
  for (const file of violations) console.error(`- drizzle/${file}`);
  process.exit(1);
}

console.log(`Migration safety passed for ${files.length} ordered migrations.`);
