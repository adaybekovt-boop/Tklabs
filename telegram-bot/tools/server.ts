import { monitorTimeoutMs, siteUrl } from "../config";
import { checkSite, formatCheckResult } from "../monitor";

interface EndpointResult {
  name: string;
  url: string;
  status: number | null;
  latencyMs: number;
  error?: string;
}

async function checkEndpoint(env: Env, name: string, url: string): Promise<EndpointResult> {
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
    return { name, url, status: response.status, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      name,
      url,
      status: null,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getServerStatus(env: Env): Promise<string> {
  return formatCheckResult(await checkSite(env), env);
}

export async function getSiteHealth(env: Env): Promise<string> {
  const base = siteUrl(env);
  const endpoints = [
    ["Главная страница", base],
    ["Страница статуса", `${base}/status`],
    ["API статуса", `${base}/api/status`],
  ] as const;
  const results = await Promise.all(endpoints.map(([name, url]) => checkEndpoint(env, name, url)));
  const lines = [`Детальная проверка здоровья ${base}`, ""];
  for (const result of results) {
    if (result.status !== null) {
      const icon = result.status >= 200 && result.status < 400 ? "✅" : "⚠️";
      lines.push(`${icon} ${result.name}: HTTP ${result.status} (${result.latencyMs} мс)`);
    } else {
      lines.push(`🔴 ${result.name}: ошибка (${result.latencyMs} мс) — ${result.error ?? "нет ответа"}`);
    }
  }
  return lines.join("\n");
}
