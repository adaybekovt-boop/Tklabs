import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

// Execute Drizzle's actual D1 SQL against SQLite, with D1's transactional batch
// contract. Hooks let regressions interleave requests at a storage boundary.
export async function sqliteD1() {
  const sqlite = new DatabaseSync(":memory:");
  const directory = new URL("../../drizzle/", import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    sqlite.exec(await readFile(new URL(file, directory), "utf8"));
  }
  const d1 = {
    sqlite,
    beforeQuery: null,
    beforeBatch: null,
    prepare(query) {
      const statement = (params = []) => ({
        bind(...values) { return statement(values); },
        async raw() {
          await d1.beforeQuery?.(query, params);
          return sqlite.prepare(query).all(...params).map((row) => Object.values(row));
        },
        async run() {
          await d1.beforeQuery?.(query, params);
          const result = sqlite.prepare(query).run(...params);
          return { success: true, results: [], meta: { changes: Number(result.changes) } };
        },
        async all() {
          if (/^\s*select\b|\breturning\b/i.test(query)) {
            await d1.beforeQuery?.(query, params);
            return { success: true, results: sqlite.prepare(query).all(...params), meta: { changes: 0 } };
          }
          return this.run();
        },
      });
      return statement();
    },
    async batch(statements) {
      await d1.beforeBatch?.();
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return d1;
}
