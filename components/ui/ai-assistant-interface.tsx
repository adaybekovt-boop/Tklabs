"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  BrainCircuit,
  Code2,
  Globe2,
  Home,
  MessageSquarePlus,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { AIChatInput, type ChatModelOption, type ChatSubmitMeta } from "@/components/ui/ai-chat-input";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { CLODEX_MODELS } from "@/lib/clodex-models";
import { ERMA_MODELS } from "@/lib/models";

type CommandCategory = "learn" | "code" | "write";
type ProviderMeta = { provider?: string; model: string; providerModel?: string; latencyMs?: number; cost?: string };
type Message = { id: string; role: "user" | "assistant"; text: string; meta?: ProviderMeta };
type AccessPayload = ClodexAccessStatus & { error?: string };
type AccountSummary = { name: string; email: string; image: string | null };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "TK";
}

export function AIAssistantInterface({ account }: { account: AccountSummary }) {
  const { copy, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCategory, setActiveCategory] = useState<CommandCategory | null>(null);
  const [composerSeed, setComposerSeed] = useState(0);
  const [composerValue, setComposerValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [clodexAccess, setClodexAccess] = useState<ClodexAccessStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/profile/access", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as AccessPayload | null;
        if (!cancelled && response.ok && payload?.active) setClodexAccess(payload);
      } catch {
        // The ordinary Erma catalog remains usable if optional access is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const models: ChatModelOption[] = useMemo(() => {
    const tierLabels = {
      light: copy.chat.modelTierLight,
      medium: copy.chat.modelTierMedium,
      heavy: copy.chat.modelTierHeavy,
    };
    const ermaModels = ERMA_MODELS.map((model) => ({
      id: model.key,
      name: model.name,
      status: model.status === "preview" ? copy.chat.modelPreview : model.available ? copy.chat.modelReady : copy.chat.modelSoon,
      available: model.available,
      tierLabel: tierLabels[model.tier],
    }));
    const unlockedClodexModels = clodexAccess?.active
      ? CLODEX_MODELS.map((model) => ({
          id: model.key,
          name: model.id,
          status: copy.chat.modelReady,
          available: true,
          tierLabel: copy.chat.clodex,
        }))
      : [];
    return [...ermaModels, ...unlockedClodexModels];
  }, [clodexAccess, copy]);

  const categories = [
    { id: "learn" as const, label: copy.chat.learn, icon: <BookOpen size={15} /> },
    { id: "code" as const, label: copy.chat.code, icon: <Code2 size={15} /> },
    { id: "write" as const, label: copy.chat.write, icon: <PenLine size={15} /> },
  ];

  const appendToLastAssistant = (update: (message: Message) => Message) => {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "assistant") next[next.length - 1] = update(last);
      return next;
    });
  };

  async function handleSubmit(prompt: string, meta: ChatSubmitMeta) {
    const stamp = Date.now();
    const userMessage: Message = { id: String(stamp) + "-user", role: "user", text: prompt };
    const assistantMessage: Message = { id: String(stamp) + "-assistant", role: "assistant", text: "" };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsSending(true);
    setActiveCategory(null);
    setComposerValue("");
    window.dispatchEvent(new CustomEvent("facility:demo-start"));

    try {
      const endpoint = meta.model.startsWith("clodex:") ? "/api/clodex" : "/api/demo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          locale: language,
          model: meta.model,
          effort: meta.effort,
          search: searchEnabled,
          research: researchEnabled,
          reason: reasonEnabled,
        }),
      });
      if (response.status === 401) {
        appendToLastAssistant((message) => ({ ...message, text: copy.auth.required }));
        return;
      }
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
        throw new Error(typeof payload?.error === "string" ? payload.error : copy.chat.apiError);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventChunk of events) {
          const line = eventChunk.split("\n").find((part) => part.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as { token?: string; done?: boolean; meta?: ProviderMeta };
          if (payload.token) appendToLastAssistant((message) => ({ ...message, text: message.text + payload.token }));
          if (payload.meta) appendToLastAssistant((message) => ({ ...message, meta: payload.meta }));
        }
      }
    } catch (error) {
      const errorText = error instanceof Error && error.message ? error.message : copy.chat.apiError;
      appendToLastAssistant((message) => ({ ...message, text: errorText }));
    } finally {
      setIsSending(false);
    }
  }

  const chooseSuggestion = (suggestion: string) => {
    setComposerValue(suggestion);
    setComposerSeed((seed) => seed + 1);
  };

  const clearChat = () => {
    setMessages([]);
    setActiveCategory(null);
    setComposerValue("");
    setComposerSeed((seed) => seed + 1);
  };

  const providerLabel = (provider?: string) => provider === "nvidia" ? copy.chat.nvidia : provider === "clodex" ? copy.chat.clodex : copy.chat.edgeFallback;
  const providerCost = (provider?: string) => provider === "edge-fallback" ? copy.chat.localCost : copy.chat.providerBilled;
  const accountInitials = initials(account.name);

  return (
    <div className="ai-chat-interface">
      <aside className="ai-chat-sidebar">
        <Link className="ai-sidebar-brand" href="/" aria-label="Imaginary Intelligence">
          <span className="ai-sidebar-mark"><img src="/tk-logo.png" alt="" /></span>
          <span><strong>TK LABS</strong><small>{copy.nav.aiChats}</small></span>
        </Link>

        <button type="button" className="ai-new-chat-button" onClick={clearChat}>
          <MessageSquarePlus size={15} />
          <span>{copy.chat.newChat}</span>
          <kbd>⌘K</kbd>
        </button>

        <div className="ai-sidebar-section-label">{copy.chat.history}</div>
        <button type="button" className="ai-history-item is-active" onClick={() => undefined}>
          <span className="status-dot" />
          <span>
            <strong>{copy.chat.session}</strong>
            <small>{messages.length ? String(messages.length) + " / " + copy.chat.response.toLowerCase() : copy.chat.noHistory}</small>
          </span>
        </button>

        <div className="ai-sidebar-spacer" />

        <div className="ai-sidebar-account">
          <Link className="ai-sidebar-profile" href="/profile">
            <span className="ai-account-avatar">
              {account.image ? <img src={account.image} alt="" referrerPolicy="no-referrer" /> : accountInitials}
            </span>
            <span><strong>{account.name}</strong><small>{account.email}</small></span>
          </Link>
          <SignOutButton label={copy.auth.signOut} />
        </div>

        <div className="ai-sidebar-note">
          <ShieldCheck size={14} />
          <span>{copy.chat.modelNotice}</span>
        </div>
      </aside>

      <section className="ai-chat-workspace">
        <header className="ai-chat-topbar">
          <div className="ai-chat-heading">
            <img className="ai-mobile-logo" src="/tk-logo.png" alt="" />
            <span>
              <span className="eyebrow">{copy.chat.eyebrow}</span>
              <span className="ai-chat-topline"><span className="status-dot" /> {copy.chat.workspace}</span>
            </span>
          </div>
          <div className="ai-chat-top-actions">
            <Link className="ai-route-chip ai-home-chip" href="/"><Home size={13} /> TK LABS</Link>
            <span className="ai-route-chip"><Globe2 size={13} /> {language.toUpperCase()}</span>
            <span className="ai-route-chip is-route"><ShieldCheck size={13} /> {copy.chat.nvidiaRoute}</span>
            <Link className="ai-mobile-profile" href="/profile" aria-label={account.name}>
              {account.image ? <img src={account.image} alt="" referrerPolicy="no-referrer" /> : <UserRound size={14} />}
            </Link>
          </div>
        </header>

        <div className="ai-chat-content">
          <div className="ai-conversation-scroll" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ai-empty-state">
                <div className="ai-empty-portrait">
                  <img src="/erma-model.png" alt="" />
                  <span>ERMA / ONLINE</span>
                </div>
                <p className="ai-empty-kicker">PLAYGROUND / 01</p>
                <h1>{copy.chat.title}</h1>
                <p>{copy.chat.subtitle}</p>
                <span className="ai-empty-hint">{copy.chat.emptyHint}</span>
              </div>
            ) : (
              <motion.div className="ai-message-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {messages.map((message) => (
                  <article className={"ai-message ai-message-" + message.role} key={message.id}>
                    <div className="ai-message-identity">
                      <span className="ai-message-avatar">
                        {message.role === "assistant"
                          ? <img src="/erma-model.png" alt="" />
                          : account.image
                            ? <img src={account.image} alt="" referrerPolicy="no-referrer" />
                            : accountInitials}
                      </span>
                      <span>
                        <strong>{message.role === "user" ? copy.chat.userMessage : copy.chat.response}</strong>
                        <small>{message.role === "assistant" ? "ERMA MODEL / LIVE" : account.name}</small>
                      </span>
                    </div>
                    <div className="ai-message-panel">
                      <div className="ai-message-body">
                        {message.text || copy.common.thinking}
                        {message.role === "assistant" && isSending && !message.text && <span className="ai-message-caret">▌</span>}
                      </div>
                      {message.meta && (
                        <div className="ai-response-meta">
                          <span><ShieldCheck size={13} /> {copy.chat.routeVerified}</span>
                          <strong>{providerLabel(message.meta.provider)}</strong>
                          <strong>{message.meta.model}</strong>
                          {message.meta.latencyMs !== undefined && <span>{copy.chat.latency} {message.meta.latencyMs}ms</span>}
                          <span>{providerCost(message.meta.provider)}</span>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </motion.div>
            )}
          </div>

          <div className="ai-composer-zone">
            <AnimatePresence>
              {activeCategory && (
                <motion.div className="ai-suggestion-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <div className="ai-suggestion-heading">
                    <span>{copy.chat.suggestionLabel}</span>
                    <button type="button" onClick={() => setActiveCategory(null)} aria-label="Close"><X size={14} /></button>
                  </div>
                  {copy.chat.suggestions[activeCategory].map((suggestion) => (
                    <button type="button" className="ai-suggestion-row" key={suggestion} onClick={() => chooseSuggestion(suggestion)}>
                      {categories.find((category) => category.id === activeCategory)?.icon}
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="ai-chat-bottom">
              <div className="ai-chat-category-row">
                {categories.map((category) => (
                  <button type="button" key={category.id} className={activeCategory === category.id ? "is-active" : ""} onClick={() => setActiveCategory((current) => current === category.id ? null : category.id)}>
                    {category.icon}{category.label}
                  </button>
                ))}
              </div>
              <div className="ai-chat-tools">
                <button type="button" className={searchEnabled ? "is-active" : ""} onClick={() => setSearchEnabled((enabled) => !enabled)}><Search size={13} /> {copy.chat.search}</button>
                <button type="button" className={researchEnabled ? "is-active" : ""} onClick={() => setResearchEnabled((enabled) => !enabled)}><Globe2 size={13} /> {copy.chat.research}</button>
                <button type="button" className={reasonEnabled ? "is-active" : ""} onClick={() => setReasonEnabled((enabled) => !enabled)}><BrainCircuit size={13} /> {copy.chat.reason}</button>
              </div>
              <AIChatInput
                key={composerSeed}
                defaultValue={composerValue}
                placeholder={copy.chat.promptPlaceholder}
                ariaLabel={copy.chat.promptAria}
                disabled={isSending}
                models={models}
                modelImageSrc="/erma-model.png"
                effortLabels={[copy.chat.effortLow, copy.chat.effortMedium, copy.chat.effortMax]}
                labels={{
                  send: copy.chat.send,
                  addFile: copy.chat.addFile,
                  removeFile: copy.chat.removeFile,
                  model: copy.chat.model,
                  effort: copy.chat.effort,
                  modelMenu: copy.chat.modelMenu,
                  comingSoon: copy.chat.modelSoon,
                }}
                onSubmit={handleSubmit}
              />
              <div className="ai-chat-input-footnote">
                <span><Sparkles size={12} /> ERMA / NVIDIA ROUTE</span>
                <span>{copy.chat.voice}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
