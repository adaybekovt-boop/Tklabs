import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { CURRENT_TERMS_VERSION, type TermsLanguage } from "@/lib/terms";

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

async function userIdForEmail(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizeEmail(email)));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `user:${hash}`;
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
    const id = await userIdForEmail(email);
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
    const row = await db.select().from(users).where(eq(users.email, email)).get();
    if (!row) throw new TermsStorageUnavailableError();
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
