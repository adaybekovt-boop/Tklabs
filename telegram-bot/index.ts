import { Bot, Context } from "grammy";
import type { Update } from "grammy/types";
import { DurableObject } from "cloudflare:workers";
import { conversationObjectName, isAuthorized, parseAllowedUserIds, userLabel } from "./access";
import { chatWithClodex, initialHistory, type ChatMessage } from "./ai";
import { CONVERSATION_BUSY_ERROR, ConversationQueue } from "./conversation-queue";
import { DurableWebhookInbox, InboxRetryAfterError, INBOX_RECEIPT_LIMIT, INBOX_RECEIPT_TTL_MS, type TelegramReply } from "./durable-inbox";
import { handleTelegramWebhook } from "./webhook";
import { checkSite, formatCheckResult, type CheckResult, type MonitorDecision, type MonitorStateStub, type SiteStatus } from "./monitor";
import { getGitHubCommits } from "./tools/github";
import { getServerStatus, getSiteHealth } from "./tools/server";

const WEBHOOK_PATH = "/telegram/webhook";
const MONITOR_STATE_KEY = "monitor-state";
const CHAT_HISTORY_KEY = "chat-history";
const FAILURE_THRESHOLD = 3;
const CONVERSATION_BUSY_REPLY = "Предыдущие сообщения ещё обрабатываются. Подожди ответа и попробуй снова.";

type StoredMonitorState = {
  lastStatus: SiteStatus;
  consecutiveFailures: number;
  lastCheck?: CheckResult;
};

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

function monitorStub(env: Env): MonitorStateStub {
  const id = env.BOT_STATE.idFromName("monitor");
  return env.BOT_STATE.get(id);
}

interface UserStateStub {
  chat(userMessage: string, updateId: number): Promise<string>;
  resetConversation(): Promise<void>;
}

function userStateStub(env: Env, userId: number, chatId: number): UserStateStub {
  const id = env.BOT_STATE.idFromName(conversationObjectName(userId, chatId));
  return env.BOT_STATE.get(id);
}

function createBot(env: Env, replyText: (ctx: Context, text: string) => Promise<void>): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN, { client: { timeoutSeconds: 15 } });

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
    try {
      await userStateStub(env, ctx.from!.id, ctx.chat.id).resetConversation();
      await replyText(ctx, "🧹 История диалога сброшена.");
    } catch (error) {
      if (error instanceof Error && error.message === CONVERSATION_BUSY_ERROR) {
        await replyText(ctx, CONVERSATION_BUSY_REPLY);
        return;
      }
      throw error;
    }
  });

  bot.on("message:text", async (ctx) => {
    try {
      const reply = await userStateStub(env, ctx.from!.id, ctx.chat.id).chat(ctx.message.text, ctx.update.update_id);
      await replyText(ctx, reply);
    } catch (error) {
      if (error instanceof Error && error.message === CONVERSATION_BUSY_ERROR) {
        await replyText(ctx, CONVERSATION_BUSY_REPLY);
        return;
      }
      console.error(JSON.stringify({ event: "ai_error", error: error instanceof Error ? error.message : String(error) }));
      throw error;
    }
  });

  return bot;
}

async function generateTelegramReplies(env: Env, update: Update): Promise<TelegramReply[]> {
  const outbox: TelegramReply[] = [];
  const bot = createBot(env, async (ctx, text) => {
    if (!ctx.chat) throw new Error("telegram_chat_missing");
    for (const chunk of splitTelegramText(text)) outbox.push({ chatId: ctx.chat.id, text: chunk });
  });
  // bot.init() retries getMe indefinitely; the durable inbox owns retries.
  bot.botInfo = await bot.api.getMe();
  await bot.handleUpdate(update);
  return outbox;
}

async function sendTelegramMessage(env: Env, chatId: string, text: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const payload = await response.json() as { ok?: boolean; error_code?: number; parameters?: { retry_after?: number }; result?: { message_id?: number } };
    if (!response.ok || payload?.ok !== true || !Number.isSafeInteger(payload.result?.message_id)) {
      if ((response.status === 429 || payload?.error_code === 429) && typeof payload?.parameters?.retry_after === "number") {
        throw new InboxRetryAfterError("Telegram sendMessage rate limited", payload.parameters.retry_after * 1_000);
      }
      throw new Error(`Telegram sendMessage HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
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
  private conversationQueue = new ConversationQueue();
  private readonly inbox = new DurableWebhookInbox(this.ctx.storage, {
    generate: (update) => generateTelegramReplies(this.env, update),
    deliver: (reply) => sendTelegramMessage(this.env, String(reply.chatId), reply.text),
    failed: (updateId) => console.error(JSON.stringify({ event: "telegram_inbox_failed", updateId })),
    failureReply: (update) => "message" in update && update.message
      ? [{ chatId: update.message.chat.id, text: "Сервис временно недоступен. Попробуй отправить сообщение позже." }]
      : [],
  });

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

  async enqueueUpdate(update: Update) {
    return this.inbox.enqueue(update);
  }

  async alarm(): Promise<void> {
    await this.inbox.alarm();
    await this.pruneChatReplies();
  }

  private async pruneChatReplies(): Promise<void> {
    const replies = await this.ctx.storage.list<{ expiresAt: number }>({ prefix: "chat-response:" });
    const live = [...replies].filter(([, reply]) => reply.expiresAt > Date.now()).slice(-INBOX_RECEIPT_LIMIT);
    const retained = new Set(live.map(([key]) => key));
    const expired = [...replies.keys()].filter((key) => !retained.has(key));
    for (let offset = 0; offset < expired.length; offset += 128) await this.ctx.storage.delete(expired.slice(offset, offset + 128));
    const next = live.map(([, reply]) => reply).sort((a, b) => a.expiresAt - b.expiresAt)[0];
    if (next) await this.ctx.storage.setAlarm(next.expiresAt);
  }

  async chat(userMessage: string, updateId: number): Promise<string> {
    return this.conversationQueue.run(async () => {
      const key = `chat-response:${String(updateId).padStart(16, "0")}`;
      const cached = await this.ctx.storage.get<{ reply: string; expiresAt: number }>(key);
      if (cached && cached.expiresAt > Date.now()) return cached.reply;
      const stored = await this.ctx.storage.get<ChatMessage[]>(CHAT_HISTORY_KEY);
      const result = await chatWithClodex(this.env, stored ?? initialHistory(), userMessage);
      await this.ctx.storage.transaction(async (txn) => {
        await txn.put(CHAT_HISTORY_KEY, result.history);
        await txn.put(key, { reply: result.reply, expiresAt: Date.now() + INBOX_RECEIPT_TTL_MS });
        if (await txn.getAlarm() === null) await txn.setAlarm(Date.now() + INBOX_RECEIPT_TTL_MS);
      });
      await this.pruneChatReplies();
      return result.reply;
    });
  }

  async resetConversation(): Promise<void> {
    await this.conversationQueue.run(() => this.ctx.storage.transaction(async (txn) => {
      await txn.put(CHAT_HISTORY_KEY, initialHistory());
      const keys = [...(await txn.list({ prefix: "chat-response:" })).keys()];
      for (let offset = 0; offset < keys.length; offset += 128) await txn.delete(keys.slice(offset, offset + 128));
      await txn.deleteAlarm();
    }));
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") {
      return Response.json({ ok: true, service: "tklabs-bot", timestamp: new Date().toISOString() });
    }
    if (url.pathname === WEBHOOK_PATH) {
      return handleTelegramWebhook(request, env, (update) => {
        const inboxId = env.BOT_STATE.idFromName("telegram-webhook-inbox:v1");
        return env.BOT_STATE.get(inboxId).enqueueUpdate(update);
      });
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
