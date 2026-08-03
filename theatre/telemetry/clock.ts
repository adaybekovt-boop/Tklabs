export const EPOCH = Date.parse("2026-01-11T09:12:00.000Z");

// The stable boot value is used for the first server/client render. The live
// clock takes over after mount, so a refresh never causes a hydration jump.
export const TELEMETRY_BOOT_SECONDS = 201_684;

export function secondsSinceEpoch(now = Date.now()) {
  return Math.max(0, (now - EPOCH) / 1000);
}

export function formatUptime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(wholeSeconds / 86_400);
  const hours = Math.floor((wholeSeconds % 86_400) / 3_600);
  const minutes = Math.floor((wholeSeconds % 3_600) / 60);
  const remainingSeconds = wholeSeconds % 60;

  return `${String(days).padStart(3, "0")}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
}
