import { env } from "cloudflare:workers";

import type { ClodexAccessStatus, ClodexConsumeResult, ClodexRedeemResult, ClodexReleaseResult, ClodexRevokeResult } from "@/lib/clodex-access";
import type { DemoReservationResult, DemoReleaseResult } from "@/lib/demo-rate-limit";
import type { TtsReservationReleaseResult, TtsReservationResult } from "@/lib/tts-rate-limit";
import { accountObjectName, legacyAccountObjectName } from "@/lib/account-id";

type AccountAccessStub = {
  getStatus(): Promise<ClodexAccessStatus>;
  redeem(code: string): Promise<ClodexRedeemResult>;
  revoke(): Promise<ClodexRevokeResult>;
  consume(): Promise<ClodexConsumeResult>;
  reserveDemo(): Promise<DemoReservationResult>;
  commitDemo(reservationId: string): Promise<DemoReservationResult>;
  releaseDemo(reservationId: string): Promise<DemoReleaseResult>;
  reserveTts(characters: number, privileged: boolean): Promise<TtsReservationResult>;
  commitTts(reservationId: string): Promise<TtsReservationResult>;
  releaseTts(reservationId: string): Promise<TtsReservationReleaseResult>;
  release(reservationId: string): Promise<ClodexReleaseResult>;
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

async function getStubPair(email: string) {
  if (!email.trim()) throw new AccountAccessUnavailableError();
  const namespace = getNamespace();
  try {
    const currentName = await accountObjectName(email);
    const legacyName = await legacyAccountObjectName(email);
    const current = namespace.getByName(currentName);
    const legacy = legacyName === currentName ? current : namespace.getByName(legacyName);
    return { current, legacy };
  } catch {
    // Missing account-ID configuration must fail closed without exposing
    // which server secret or identifier calculation failed.
    throw new AccountAccessUnavailableError();
  }
}

async function getStub(email: string) {
  const { current, legacy } = await getStubPair(email);
  const currentStatus = await current.getStatus();
  // Object-name migrations must not resurrect an expired, revoked, or
  // version-invalid grant from the legacy hash. A non-empty current object is
  // authoritative forever; legacy is consulted only for a truly empty object.
  if (currentStatus.hasGrant || current === legacy) return current;
  const legacyStatus = await legacy.getStatus();
  return legacyStatus.hasGrant ? legacy : current;
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

export async function releaseClodexAccess(email: string, reservationId: string) {
  return (await getStub(email)).release(reservationId);
}

export async function revokeClodexAccess(email: string) {
  return (await getStub(email)).revoke();
}

export async function reserveTts(email: string, characters: number, privileged: boolean) {
  return (await getStub(email)).reserveTts(characters, privileged);
}

export async function commitTts(email: string, reservationId: string) {
  return (await getStub(email)).commitTts(reservationId);
}

export async function releaseTts(email: string, reservationId: string) {
  return (await getStub(email)).releaseTts(reservationId);
}
