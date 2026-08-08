import { lt } from "drizzle-orm";

import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

export type AuditEventCode = "legal.accepted" | "privacy.exported" | "privacy.deleted" | "sync.updated" | "sync.deleted" | "crypto.migrated";
export const AUDIT_RETENTION_DAYS = 90;

export async function recordAuditEvent(userId: string, eventCode: AuditEventCode) {
  if (!userId.trim()) return;
  const db = getDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(auditEvents).where(lt(auditEvents.createdAt, cutoff)).run();
  await db.insert(auditEvents).values({ id: crypto.randomUUID(), userId, eventCode, createdAt: now }).run();
}
