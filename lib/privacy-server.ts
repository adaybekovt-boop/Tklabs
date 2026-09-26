import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { legalAcceptances, users, workspaceSnapshots } from "@/db/schema";
import { revokeClodexAccess } from "@/lib/account-access";
import { auditEventStatements, recordAuditEvent } from "@/lib/audit-events";
import { getWorkspaceSnapshot } from "@/lib/workspace-sync-server";

function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export class PrivacyDataUnavailableError extends Error { constructor() { super("Privacy data service is unavailable."); this.name = "PrivacyDataUnavailableError"; } }

export async function exportAccountData(emailValue: string) {
  const email = normalizeEmail(emailValue); if (!email) throw new PrivacyDataUnavailableError();
  try {
    const db = getDb(); const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) return { exportedAt: new Date().toISOString(), account: null, legalAcceptances: [], workspaceSync: null };
    const acceptances = await db.select().from(legalAcceptances).where(eq(legalAcceptances.userId, user.id)).all();
    const workspaceSync = await getWorkspaceSnapshot(email);
    await recordAuditEvent(user.id, "privacy.exported");
    return { exportedAt: new Date().toISOString(), account: { email: user.email, name: user.name, image: user.image, language: user.language, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() }, legalAcceptances: acceptances.map((entry) => ({ bundleVersion: entry.bundleVersion, bundleDigest: entry.bundleDigest, language: entry.language, acceptedAt: entry.acceptedAt.toISOString() })), workspaceSync };
  } catch (error) { console.error("Unable to export account privacy data", error); throw new PrivacyDataUnavailableError(); }
}

export async function deleteAccountData(emailValue: string) {
  const email = normalizeEmail(emailValue); if (!email) throw new PrivacyDataUnavailableError();
  try {
    const db = getDb(); const user = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
    if (!user?.id) return { deleted: false, accessRevocationAttempted: false };
    try {
      await revokeClodexAccess(email);
    } catch (error) {
      console.error("Unable to revoke external account access before privacy deletion", error instanceof Error ? error.name : "unknown");
      throw new PrivacyDataUnavailableError();
    }
    // Resolve the ID inside the transaction: terms reads can migrate legacy
    // IDs while external access revocation is in flight.
    const currentId = sql<string>`(${db.select({ id: users.id }).from(users).where(eq(users.email, email))})`;
    await db.batch([
      ...auditEventStatements(db, currentId, "privacy.deleted"),
      db.delete(legalAcceptances).where(eq(legalAcceptances.userId, currentId)),
      db.delete(workspaceSnapshots).where(eq(workspaceSnapshots.userId, currentId)),
      db.delete(users).where(eq(users.email, email)),
    ]);
    return { deleted: true, accessRevocationAttempted: true };
  } catch (error) { console.error("Unable to delete account privacy data", error); throw new PrivacyDataUnavailableError(); }
}
