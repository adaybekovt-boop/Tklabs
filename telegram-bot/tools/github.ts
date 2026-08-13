import { githubRepo } from "../config";

import { fetchWithTimeout } from "./http";

interface CommitPayload {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string } | null;
  };
}

function isCommitPayload(value: unknown): value is CommitPayload[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const commit = (item as { commit?: unknown }).commit;
    return typeof (item as { sha?: unknown }).sha === "string"
      && typeof (item as { html_url?: unknown }).html_url === "string"
      && !!commit
      && typeof commit === "object"
      && typeof (commit as { message?: unknown }).message === "string";
  });
}

export async function getGitHubCommits(env: Env, requestedCount = 5): Promise<string> {
  const repo = githubRepo(env);
  if (!/^[^/]+\/[^/]+$/.test(repo)) return "Ошибка: GITHUB_REPO должен быть в формате owner/repository.";
  const count = Math.min(20, Math.max(1, Math.trunc(requestedCount) || 5));
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "TKlab-Telegram-Bot/2.0",
  };
  if (env.REPO_GITHUB_TOKEN?.trim()) headers.Authorization = `Bearer ${env.REPO_GITHUB_TOKEN.trim()}`;

  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${repo}/commits?per_page=${count}`, { headers });
    const payload: unknown = await response.json();
    if (!response.ok) return `Ошибка GitHub API: HTTP ${response.status}`;
    if (!isCommitPayload(payload) || payload.length === 0) return `В репозитории ${repo} пока нет коммитов.`;

    const lines = [`Последние ${payload.length} коммитов в ${repo}:`, ""];
    for (const commit of payload) {
      const author = commit.commit.author?.name ?? "неизвестный автор";
      const date = commit.commit.author?.date
        ? new Date(commit.commit.author.date).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })
        : "дата неизвестна";
      const message = commit.commit.message.split("\n", 1)[0].slice(0, 120);
      lines.push(`${commit.sha.slice(0, 7)} — ${message}`);
      lines.push(`${author} | ${date} МСК | ${commit.html_url}`);
      lines.push("");
    }
    return lines.join("\n");
  } catch (error) {
    return `Не удалось получить коммиты: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function getGitHubStatus(env: Env): Promise<string> {
  try {
    const startedAt = Date.now();
    const response = await fetchWithTimeout("https://api.github.com", {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "TKlab-Telegram-Bot/2.0",
      },
    });
    return response.ok
      ? `✅ GitHub API доступен (${Date.now() - startedAt} мс)`
      : `⚠️ GitHub API ответил HTTP ${response.status} (${Date.now() - startedAt} мс)`;
  } catch (error) {
    return `🔴 GitHub API недоступен: ${error instanceof Error ? error.message : String(error)}`;
  }
}
