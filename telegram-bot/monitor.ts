import { monitorTimeoutMs, siteUrl } from "./config";

export type SiteStatus = "unknown" | "ok" | "degraded" | "down";

export interface CheckResult {
  timestamp: string;
  status: Exclude<SiteStatus, "unknown">;
  httpCode: number | null;
  latencyMs: number;
  error?: string;
}

export interface MonitorDecision {
  notify: boolean;
  previousStatus: SiteStatus;
  currentStatus: SiteStatus;
  result: CheckResult;
}

export interface MonitorStateStub {
  processMonitorCheck(result: CheckResult): Promise<MonitorDecision>;
}

function statusForHttp(status: number): CheckResult["status"] {
  if (status >= 200 && status < 400) return "ok";
  if (status >= 400 && status < 500) return "degraded";
  return "down";
}

export async function checkSite(env: Env, url = siteUrl(env)): Promise<CheckResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), monitorTimeoutMs(env));

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "TKlab-Monitor/2.0" },
    });
    await response.body?.cancel();
    const latencyMs = Date.now() - startedAt;
    const status = statusForHttp(response.status);
    return {
      timestamp: new Date().toISOString(),
      status,
      httpCode: response.status,
      latencyMs,
      ...(status === "ok" ? {} : { error: `HTTP ${response.status} ${response.statusText}` }),
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      status: "down",
      httpCode: null,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function formatCheckResult(result: CheckResult, env: Env): string {
  const statusText: Record<CheckResult["status"], string> = {
    ok: "Сайт работает",
    degraded: "Частичная недоступность",
    down: "Сайт недоступен",
  };
  const emoji: Record<CheckResult["status"], string> = {
    ok: "✅",
    degraded: "⚠️",
    down: "🔴",
  };
  const time = new Date(result.timestamp).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
  const lines = [
    `${emoji[result.status]} ${statusText[result.status]}`,
    `Время: ${time} (МСК)`,
    `URL: ${siteUrl(env)}`,
    `Задержка: ${result.latencyMs} мс`,
    result.httpCode === null ? "HTTP-код: нет ответа" : `HTTP-код: ${result.httpCode}`,
  ];
  if (result.error) lines.push(`Ошибка: ${result.error}`);
  return lines.join("\n");
}
