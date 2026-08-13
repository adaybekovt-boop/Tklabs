import { Bot, Context, GrammyError, HttpError, webhookCallback } from "grammy";
import { DurableObject } from "cloudflare:workers";
import { isAuthorized, parseAllowedUserIds, userLabel } from "./access";
import { chatWithClodex, initialHistory, type ChatMessage } from "./ai";
import { checkSite, formatCheckResult, type CheckResult, type MonitorDecision, type MonitorStateStub, type SiteStatus } from "./monitor";
import { getGitHubCommits } from "./tools/github";
import { fetchWithTimeout } from "./tools/http";
import { getServerStatus, getSiteHealth } from "./tools/server";

const WEBHOOK_PATH = "/telegram/webhook";
const MONITOR_STATE_KEY = "monitor-state";
const CHAT_HISTORY_KEY = "chat-history";
const FAILURE_THRESHOLD = 3;

type StoredMonitorState = {
  lastStatus: SiteStatus;
  consecutiveFailures: number;
  lastCheck?: CheckResult;
};

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

function splitTelegramText(text: string, maxLength = 3900): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    const boundary = remaining.lastIndexOf("\n", maxLength);
    const cut = boundary > 0 ? boundary : maxLength;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n+/, "");
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function replyText(ctx: Context, text: string): Promise<void> {
  for (const chunk of splitTelegramText(text)) await ctx.reply(chunk, { link_preview_options: { is_disabled: true } });
}

function monitorStub(env: Env): MonitorStateStub {
  const id = env.BOT_STATE.idFromName("monitor");
  return env.BOT_STATE.get(id);
}

interface UserStateStub {
  chat(userMessage: string): Promise<string>;
  resetConversation(): Promise<void>;
}

function userStateStub(env: Env, userId: number): UserStateStub {
  const id = env.BOT_STATE.idFromName("user:" + userId);
  return env.BOT_STATE.get(id);
}

function createBot(env: Env): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.use(async (ctx, next) => {
    if (!isAuthorized(ctx.from?.id, env)) return;
    console.log(JSON.stringify({ event: "telegram_update", user: userLabel(ctx) }));
    await next();
  });

  bot.command("start", async (ctx) => {
    await replyText(ctx, "👋 Привет! Я монитор TKlab.\n\nКоманды:\n/status — текущий статус сайта\n/health — проверка ключевых эндпоинтов\n/commits [N] — последние коммиты\n/reset — сбросить историю AI\n/help — справка\n\nМожно просто задать вопрос о сайте или GitHub.");
  });

  bot.command("help", async (ctx) => {
    await replyText(ctx, "Команды TKlab Monitor:\n/status — текущий статус сайта\n/health — подробная проверка\n/commits [N] — последние N коммитов\n/reset — сбросить историю AI\n/help — эта справка");
  });

  bot.command("status", async (ctx) => {
    await replyText(ctx, await getServerStatus(env));
  });

  bot.command("health", async (ctx) => {
    await replyText(ctx, await getSiteHealth(env));
  });

  bot.command("commits", async (ctx) => {
    const text = ctx.message?.text ?? "";
    const match = text.match(/^\/commits(?:@\w+)?(?:\s+(\d+))?/i);
    const count = match?.[1] ? Number(match[1]) : 5;
    await replyText(ctx, await getGitHubCommits(env, count));
  });

  bot.command("reset", async (ctx) => {
    await userStateStub(env, ctx.from!.id).resetConversation();
    await replyText(ctx, "🧹 История диалога сброшена.");
  });

  bot.on("message:text", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    try {
      const reply = await userStateStub(env, ctx.from!.id).chat(ctx.message.text);
      await replyText(ctx, reply);
    } catch (error) {
      console.error(JSON.stringify({ event: "ai_error", error: error instanceof Error ? error.message : String(error) }));
      await replyText(ctx, "❌ AI временно недоступен. Проверь CLODEX_API_KEY и попробуй ещё раз.");
    }
  });

  bot.catch((error) => {
    const telegramError = error.error;
    if (telegramError instanceof GrammyError) {
      console.error(JSON.stringify({ event: "telegram_error", code: telegramError.error_code, message: telegramError.message }));
    } else if (telegramError instanceof HttpError) {
      console.error(JSON.stringify({ event: "telegram_http_error", message: telegramError.message }));
    } else {
      console.error(JSON.stringify({ event: "telegram_unknown_error", message: String(telegramError) }));
    }
  });

  return bot;
}

async function sendTelegramMessage(env: Env, chatId: string, text: string): Promise<void> {
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram sendMessage HTTP ${response.status}`);
}

async function notifyStatusChange(env: Env, decision: MonitorDecision): Promise<void> {
  const prefix = decision.currentStatus === "ok" && decision.previousStatus !== "unknown"
    ? "🎉 Сайт восстановлен!\n\n"
    : "🚨 Внимание: проблемы с сайтом!\n\n";
  const message = prefix + formatCheckResult(decision.result, env);
  const recipients = parseAllowedUserIds(env.TELEGRAM_ALLOWED_USER_IDS);
  const deliveries = await Promise.allSettled([...recipients].map((chatId) => sendTelegramMessage(env, chatId, message)));
  for (const delivery of deliveries) {
    if (delivery.status === "rejected") console.error(JSON.stringify({ event: "monitor_notification_error", error: String(delivery.reason) }));
  }
}

export class BotState extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async processMonitorCheck(result: CheckResult): Promise<MonitorDecision> {
    const stored = await this.ctx.storage.get<StoredMonitorState>(MONITOR_STATE_KEY);
    const previousStatus = stored?.lastStatus ?? "unknown";
    let currentStatus: SiteStatus = previousStatus;
    let consecutiveFailures = stored?.consecutiveFailures ?? 0;
    let notify = false;

    if (result.status === "ok") {
      consecutiveFailures = 0;
      currentStatus = "ok";
      notify = previousStatus !== "unknown" && previousStatus !== "ok";
    } else {
      consecutiveFailures += 1;
      if (consecutiveFailures >= FAILURE_THRESHOLD && previousStatus !== result.status) {
        currentStatus = result.status;
        notify = true;
      }
    }

    await this.ctx.storage.put<StoredMonitorState>(MONITOR_STATE_KEY, {
      lastStatus: currentStatus,
      consecutiveFailures,
      lastCheck: result,
    });
    return { notify, previousStatus, currentStatus, result };
  }

  async chat(userMessage: string): Promise<string> {
    const stored = await this.ctx.storage.get<ChatMessage[]>(CHAT_HISTORY_KEY);
    const result = await chatWithClodex(this.env, stored ?? initialHistory(), userMessage);
    await this.ctx.storage.put(CHAT_HISTORY_KEY, result.history);
    return result.reply;
  }

  async resetConversation(): Promise<void> {
    await this.ctx.storage.put(CHAT_HISTORY_KEY, initialHistory());
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") {
      return Response.json({ ok: true, service: "tklabs-bot", timestamp: new Date().toISOString() });
    }
    if (url.pathname === WEBHOOK_PATH) {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      if (!env.TELEGRAM_BOT_TOKEN?.trim()) return Response.json({ ok: false, error: "bot_not_configured" }, { status: 500 });
      if (!env.TELEGRAM_WEBHOOK_SECRET?.trim()) return new Response("Webhook secret is not configured", { status: 503 });
      const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
      if (!(await constantTimeEqual(provided, env.TELEGRAM_WEBHOOK_SECRET))) return new Response("Forbidden", { status: 403 });
      return webhookCallback(createBot(env), "cloudflare-mod")(request);
    }
    if (request.method === "GET") return new Response("TKlab Telegram Monitor is running.");
    return new Response("Not Found", { status: 404 });
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const result = await checkSite(env);
    const decision = await monitorStub(env).processMonitorCheck(result);
    console.log(JSON.stringify({ event: "monitor_check", status: result.status, httpCode: result.httpCode, latencyMs: result.latencyMs, notify: decision.notify }));
    if (decision.notify && env.TELEGRAM_BOT_TOKEN?.trim()) await notifyStatusChange(env, decision);
  },
} satisfies ExportedHandler<Env>;




