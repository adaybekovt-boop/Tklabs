import { env } from "cloudflare:workers";

import type { ClodexAccessStatus, ClodexConsumeResult, ClodexRedeemResult, ClodexReleaseResult } from "@/lib/clodex-access";
import type { DemoConsumeResult } from "@/lib/demo-rate-limit";

type AccountAccessStub = {
  getStatus(): Promise<ClodexAccessStatus>;
  redeem(code: string): Promise<ClodexRedeemResult>;
  consume(): Promise<ClodexConsumeResult>;
  consumeDemo(): Promise<DemoConsumeResult>;
  release(): Promise<ClodexReleaseResult>;
};

type AccountAccessNamespace = {
  getByName(name: string): AccountAccessStub;
};

export class AccountAccessUnavailableError extends Error {
  constructor() {
    super("The Clodex account access service is unavailable.");
  }
}

function getNamespace() {
  const namespace = (env as unknown as { CLODEX_ACCESS?: AccountAccessNamespace }).CLODEX_ACCESS;
  if (!namespace) throw new AccountAccessUnavailableError();
  return namespace;
}

async function accountObjectName(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizedEmail));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `account:${hash}`;
}

async function getStub(email: string) {
  if (!email.trim()) throw new AccountAccessUnavailableError();
  return getNamespace().getByName(await accountObjectName(email));
}

export async function getClodexAccessStatus(email: string) {
  return (await getStub(email)).getStatus();
}

export async function redeemClodexAccess(email: string, code: string) {
  return (await getStub(email)).redeem(code);
}

export async function consumeClodexAccess(email: string) {
  return (await getStub(email)).consume();
}

export async function releaseClodexAccess(email: string) {
  return (await getStub(email)).release();
}
