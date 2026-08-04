import { env } from "cloudflare:workers";

import type { DemoConsumeResult } from "@/lib/demo-rate-limit";

type DemoRateLimitStub = {
  consumeDemo(): Promise<DemoConsumeResult>;
};

type DemoRateLimitNamespace = {
  getByName(name: string): DemoRateLimitStub;
};

export class DemoRateLimitUnavailableError extends Error {
  constructor() {
    super("The demo rate-limit service is unavailable.");
  }
}

function getNamespace() {
  const namespace = (env as unknown as { CLODEX_ACCESS?: DemoRateLimitNamespace }).CLODEX_ACCESS;
  if (!namespace) throw new DemoRateLimitUnavailableError();
  return namespace;
}

async function rateLimitObjectName(identifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identifier));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `demo:${hash}`;
}

export async function consumeDemoRequest(identifier: string) {
  if (!identifier.trim()) throw new DemoRateLimitUnavailableError();
  return getNamespace().getByName(await rateLimitObjectName(identifier.trim())).consumeDemo();
}
