import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { CURRENT_TERMS_VERSION, type TermsLanguage } from "@/lib/terms";
import { legacyTermsUserId, termsUserId } from "@/lib/terms-user-id";

export class TermsStorageUnavailableError extends Error {
  constructor() {
    super("The terms consent database is unavailable.");
    this.name = "TermsStorageUnavailableError";
  }
}

export type TermsUser = {
  email: string;
  name?: string | null;
  image?: string | null;
};

export type TermsConsentStatus = {
  required: boolean;
  accepted: boolean;
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  language: TermsLanguage | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function ensureUser(user: TermsUser) {
  const email = normalizeEmail(user.email);
  if (!email) throw new TermsStorageUnavailableError();

  try {
    const db = getDb();
    const now = new Date();
    const id = await termsUserId(email);
    await db.insert(users).values({
      id,
      email,
      name: user.name?.trim() || null,
      image: user.image?.trim() || null,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: users.email,
      set: {
        name: user.name?.trim() || null,
        image: user.image?.trim() || null,
        updatedAt: now,
      },
    }).run();
    let row = await db.select().from(users).where(eq(users.email, email)).get();
    if (!row) throw new TermsStorageUnavailableError();
    // `id` is looked up only via the unique `email` column above, never
    // recomputed and matched, so switching hash functions never breaks a
    // lookup. Rows created before the HMAC migration still carry the bare
    // SHA-256 id (onConflictDoUpdate never rewrites `id`); backfill them to
    // the HMAC id opportunistically. `id` has no external references (see
    // db/schema.ts), so rewriting the primary key here is safe.
    if (row.id !== id && row.id === (await legacyTermsUserId(email))) {
      await db.update(users).set({ id }).where(eq(users.email, email)).run();
      row = { ...row, id };
    }
    return { db, row };
  } catch (error) {
    if (error instanceof TermsStorageUnavailableError) throw error;
    console.error("Unable to access the terms consent database", error);
    throw new TermsStorageUnavailableError();
  }
}

export async function getTermsConsentStatus(user: TermsUser): Promise<TermsConsentStatus> {
  const { row } = await ensureUser(user);
  const accepted = Boolean(row.termsAccepted);
  const acceptedVersion = row.termsVersion ?? null;
  return {
    required: !accepted || acceptedVersion !== CURRENT_TERMS_VERSION,
    accepted,
    currentVersion: CURRENT_TERMS_VERSION,
    acceptedVersion,
    acceptedAt: serializeDate(row.termsAcceptedAt),
    language: row.language ?? null,
  };
}

export async function acceptTerms(user: TermsUser, language: TermsLanguage, version: string) {
  if (version !== CURRENT_TERMS_VERSION) throw new Error("Terms version is not current.");
  const { db, row } = await ensureUser(user);
  const now = new Date();
  await db.update(users).set({
    termsAccepted: true,
    termsAcceptedAt: now,
    termsVersion: CURRENT_TERMS_VERSION,
    language,
    updatedAt: now,
  }).where(eq(users.id, row.id)).run();
  return getTermsConsentStatus(user);
}
