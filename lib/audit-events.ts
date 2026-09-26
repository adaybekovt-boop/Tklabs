import { lt, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

export type AuditEventCode = "legal.accepted" | "privacy.exported" | "privacy.deleted" | "sync.updated" | "sync.deleted" | "crypto.migrated";
export const AUDIT_RETENTION_DAYS = 90;

// Let state changes and their audit evidence share the same D1 transaction.
// Recording success before a later statement fails leaves a false audit trail.
export function auditEventStatements(db: ReturnType<typeof getDb>, userId: string | SQL<string>, eventCode: AuditEventCode, now = new Date()) {
  const cutoff = new Date(now.getTime() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return [
    db.delete(auditEvents).where(lt(auditEvents.createdAt, cutoff)),
    db.insert(auditEvents).values({ id: crypto.randomUUID(), userId, eventCode, createdAt: now }),
  ] as const;
}

export async function recordAuditEvent(userId: string, eventCode: AuditEventCode) {
  if (!userId.trim()) return;
  const db = getDb();
  await db.batch(auditEventStatements(db, userId, eventCode));
}
