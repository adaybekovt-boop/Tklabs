export function envString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function envNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function siteUrl(env: Env): string {
  return envString(env.SITE_URL, "https://tklabs.uk").replace(/\/$/, "");
}

export function githubRepo(env: Env): string {
  return envString(env.GITHUB_REPO, "adaybekovt/Tklabs");
}

export function monitorTimeoutMs(env: Env): number {
  return envNumber(env.MONITOR_TIMEOUT_MS, 15_000, 1_000, 60_000);
}

export function clodexApiUrl(env: Env): string {
  return envString(env.CLODEX_API_URL, "https://clodex.xyz/v1").replace(/\/$/, "");
}

export function clodexModel(env: Env): string {
  return envString(env.CLODEX_MODEL, "gpt-5.5");
}

export function clodexMaxTokens(env: Env): number {
  return envNumber(env.CLODEX_MAX_TOKENS, 1_024, 128, 4_096);
}
