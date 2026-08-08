import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { AUDIT_RETENTION_DAYS } from "../lib/audit-events.ts";
import { PUBLISHED_INCIDENTS } from "../lib/incidents.ts";

test("governance audit events are content-free and retention bounded", async () => { assert.equal(AUDIT_RETENTION_DAYS, 90); const source = await readFile("lib/audit-events.ts", "utf8"); assert.doesNotMatch(source, /prompt|attachment|answer/i); assert.match(source, /lt\(auditEvents\.createdAt/); });
test("incident registry may be empty without claiming uptime", async () => { assert.deepEqual(PUBLISHED_INCIDENTS, []); const page = await readFile("app/status/page.tsx", "utf8"); assert.match(page, /not a 100% uptime claim/); });
