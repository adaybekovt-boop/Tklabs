import { clodexApiUrl, clodexMaxTokens, clodexModel, monitorTimeoutMs } from "./config";
import { getGitHubCommits } from "./tools/github";
import { getServerStatus, getSiteHealth } from "./tools/server";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ClodexChoice {
  finish_reason: string;
  message: {
    content: string | null;
    tool_calls?: ToolCall[];
  };
}

interface ClodexResponse {
  choices: ClodexChoice[];
}

const SYSTEM_PROMPT = `Ты — AI-ассистент мониторинга проекта TKlab.
Отвечай на русском, коротко и по делу.
Когда спрашивают о состоянии сайта или GitHub, сначала используй соответствующий инструмент.
Не выдумывай данные: опирайся только на результаты инструментов и явно сообщай об ошибках.
Ты не имеешь права менять код, деплоить или выполнять команды на сервере.`;

export const initialHistory = (): ChatMessage[] => [{ role: "system", content: SYSTEM_PROMPT }];

function isToolCall(value: unknown): value is ToolCall {
  if (!value || typeof value !== "object") return false;
  const item = value as { id?: unknown; type?: unknown; function?: unknown };
  if (typeof item.id !== "string" || item.type !== "function" || !item.function || typeof item.function !== "object") return false;
  const fn = item.function as { name?: unknown; arguments?: unknown };
  return typeof fn.name === "string" && typeof fn.arguments === "string";
}

function isClodexResponse(value: unknown): value is ClodexResponse {
  if (!value || typeof value !== "object") return false;
  const choices = (value as { choices?: unknown }).choices;
  return Array.isArray(choices) && choices.every((choice) => {
    if (!choice || typeof choice !== "object") return false;
    const item = choice as { finish_reason?: unknown; message?: unknown };
    if (typeof item.finish_reason !== "string" || !item.message || typeof item.message !== "object") return false;
    const message = item.message as { content?: unknown; tool_calls?: unknown };
    return (typeof message.content === "string" || message.content === null || message.content === undefined)
      && (message.tool_calls === undefined || (Array.isArray(message.tool_calls) && message.tool_calls.every(isToolCall)));
  });
}

async function callClodex(env: Env, messages: ChatMessage[]): Promise<ClodexResponse> {
  if (!env.CLODEX_API_KEY?.trim()) throw new Error("CLODEX_API_KEY не настроен");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(30_000, monitorTimeoutMs(env) * 4));
  try {
    const response = await fetch(`${clodexApiUrl(env)}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.CLODEX_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: clodexModel(env),
        messages,
        tools: AI_TOOLS,
        tool_choice: "auto",
        max_tokens: clodexMaxTokens(env),
      }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Clodex API: HTTP ${response.status}`);
    if (!isClodexResponse(payload)) throw new Error("Clodex API вернул неожиданный формат");
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_server_status",
      description: "Проверить главную страницу сайта и вернуть HTTP-код и задержку.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_site_health",
      description: "Проверить главную страницу, /status и /api/status.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_github_commits",
      description: "Получить последние коммиты основного репозитория TKlab.",
      parameters: {
        type: "object",
        properties: { count: { type: "number", description: "Количество от 1 до 20" } },
        required: [],
      },
    },
  },
];

async function executeTool(env: Env, name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_server_status":
      return getServerStatus(env);
    case "get_site_health":
      return getSiteHealth(env);
    case "get_github_commits": {
      const count = typeof args.count === "number" && Number.isFinite(args.count) ? args.count : 5;
      return getGitHubCommits(env, count);
    }
    default:
      return `Неизвестный инструмент: ${name}`;
  }
}

function compactHistory(history: ChatMessage[]): ChatMessage[] {
  const system = history.find((message) => message.role === "system") ?? initialHistory()[0];
  return [system, ...history.filter((message) => message.role !== "system").slice(-24)];
}

export async function chatWithClodex(
  env: Env,
  history: ChatMessage[],
  userMessage: string,
): Promise<{ reply: string; history: ChatMessage[] }> {
  const nextHistory = [...(history.length > 0 ? history : initialHistory()), { role: "user" as const, content: userMessage }];

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const response = await callClodex(env, nextHistory);
    const choice = response.choices[0];
    if (!choice) throw new Error("Clodex API вернул пустой ответ");

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      nextHistory.push({
        role: "assistant",
        content: choice.message.content ?? "",
        tool_calls: choice.message.tool_calls,
      });
      for (const toolCall of choice.message.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          const parsed: unknown = JSON.parse(toolCall.function.arguments || "{}");
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed as Record<string, unknown>;
        } catch {
          // The tool receives an empty argument object when the model sends invalid JSON.
        }
        let result: string;
        try {
          result = await executeTool(env, toolCall.function.name, args);
        } catch (error) {
          result = `Инструмент завершился ошибкой: ${error instanceof Error ? error.message : String(error)}`;
        }
        nextHistory.push({ role: "tool", content: result, tool_call_id: toolCall.id });
      }
      continue;
    }

    const reply = choice.message.content?.trim();
    if (!reply) throw new Error("Clodex API вернул пустой текстовый ответ");
    nextHistory.push({ role: "assistant", content: reply });
    return { reply, history: compactHistory(nextHistory) };
  }

  throw new Error("AI запросил слишком много последовательных инструментов");
}
