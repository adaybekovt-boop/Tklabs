import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { legalAcceptances, users, workspaceSnapshots } from "@/db/schema";
import { revokeClodexAccess } from "@/lib/account-access";
import { recordAuditEvent } from "@/lib/audit-events";
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
    let accessRevocationAttempted = false; try { await revokeClodexAccess(email); accessRevocationAttempted = true; } catch { accessRevocationAttempted = true; }
    await recordAuditEvent(user.id, "privacy.deleted");
    await db.delete(legalAcceptances).where(eq(legalAcceptances.userId, user.id)).run();
    await db.delete(workspaceSnapshots).where(eq(workspaceSnapshots.userId, user.id)).run();
    await db.delete(users).where(eq(users.id, user.id)).run();
    return { deleted: true, accessRevocationAttempted };
  } catch (error) { console.error("Unable to delete account privacy data", error); throw new PrivacyDataUnavailableError(); }
}
