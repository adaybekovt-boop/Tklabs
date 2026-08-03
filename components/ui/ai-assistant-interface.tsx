"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, BrainCircuit, Code2, Globe2, MessageSquarePlus, PenLine, Search, ShieldCheck, Sparkles, X } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { AIChatInput, type ChatModelOption, type ChatSubmitMeta } from "@/components/ui/ai-chat-input";
import { ERMA_MODELS } from "@/lib/models";

type CommandCategory = "learn" | "code" | "write";
type ProviderMeta = { provider?: string; model: string; providerModel?: string; latencyMs?: number; cost?: string };
type Message = { id: string; role: "user" | "assistant"; text: string; meta?: ProviderMeta };

export function AIAssistantInterface() {
  const { copy, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCategory, setActiveCategory] = useState<CommandCategory | null>(null);
  const [composerSeed, setComposerSeed] = useState(0);
  const [composerValue, setComposerValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [reasonEnabled, setReasonEnabled] = useState(false);

  const models: ChatModelOption[] = useMemo(() => {
    const tierLabels = {
      light: copy.chat.modelTierLight,
      medium: copy.chat.modelTierMedium,
      heavy: copy.chat.modelTierHeavy,
    };
    return ERMA_MODELS.map((model) => ({
      id: model.key,
      name: model.name,
      status: model.status === "preview" ? copy.chat.modelPreview : model.available ? copy.chat.modelReady : copy.chat.modelSoon,
      available: model.available,
      tierLabel: tierLabels[model.tier],
    }));
  }, [copy]);

  const categories = [
    { id: "learn" as const, label: copy.chat.learn, icon: <BookOpen size={17} /> },
    { id: "code" as const, label: copy.chat.code, icon: <Code2 size={17} /> },
    { id: "write" as const, label: copy.chat.write, icon: <PenLine size={17} /> },
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
    const userMessage: Message = { id: `${Date.now()}-user`, role: "user", text: prompt };
    const assistantMessage: Message = { id: `${Date.now()}-assistant`, role: "assistant", text: "" };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsSending(true);
    setActiveCategory(null);
    setComposerValue("");
    window.dispatchEvent(new CustomEvent("facility:demo-start"));

    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, locale: language, model: meta.model, effort: meta.effort, search: searchEnabled, research: researchEnabled, reason: reasonEnabled }) });
      if (response.status === 401) {
        appendToLastAssistant((message) => ({ ...message, text: copy.auth.required }));
        return;
      }
      if (!response.ok || !response.body) throw new Error("AI response unavailable");
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
      const errorText = error instanceof Error && error.message === copy.auth.required ? error.message : copy.chat.apiError;
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

  return (
    <div className="ai-chat-interface">
      <aside className="ai-chat-sidebar">
        <div className="ai-sidebar-brand"><span className="ai-sidebar-mark">II</span><div><strong>{copy.nav.aiChats.toUpperCase()}</strong><small>{copy.chat.workspace}</small></div></div>
        <button type="button" className="ai-new-chat-button" onClick={clearChat}><MessageSquarePlus size={16} /> {copy.chat.newChat}<span>⌘K</span></button>
        <div className="ai-sidebar-section-label">{copy.chat.history}</div>
        <div className="ai-history-item is-active"><span className="status-dot" /><div><strong>{copy.chat.session}</strong><small>{messages.length ? `${messages.length} / ${copy.chat.response.toLowerCase()}` : copy.chat.noHistory}</small></div></div>
        <div className="ai-sidebar-spacer" />
        <div className="ai-sidebar-note"><ShieldCheck size={15} /><span>{copy.chat.noAccount}</span></div>
      </aside>

      <section className="ai-chat-workspace">
        <header className="ai-chat-topbar"><div><span className="eyebrow text-[#e7ff49]">{copy.chat.eyebrow}</span><span className="ai-chat-topline"><span className="status-dot" /> {copy.chat.workspace}</span></div><div className="ai-chat-top-actions"><span className="ai-route-chip"><Globe2 size={14} /> {language.toUpperCase()}</span><span className="ai-route-chip"><ShieldCheck size={14} /> {copy.chat.nvidiaRoute}</span></div></header>

        <div className="ai-chat-content">
          {messages.length === 0 ? (
            <div className="ai-empty-state"><div className="ai-empty-orb"><span>II</span><i /><i /><i /></div><h1>{copy.chat.title}</h1><p>{copy.chat.subtitle}</p><span className="ai-empty-hint">{copy.chat.emptyHint}</span></div>
          ) : (
            <motion.div className="ai-message-list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {messages.map((message) => <article className={`ai-message ai-message-${message.role}`} key={message.id}><div className="ai-message-label">{message.role === "user" ? copy.chat.userMessage : copy.chat.response}</div><div className="ai-message-body">{message.text || copy.common.thinking}{message.role === "assistant" && isSending && !message.text && <span className="ai-message-caret">▌</span>}</div>{message.meta && <div className="ai-response-meta"><ShieldCheck size={14} /> {copy.chat.routeVerified}<strong>{providerLabel(message.meta.provider)}</strong><strong>{message.meta.model}</strong>{message.meta.latencyMs !== undefined && <span>{copy.chat.latency} {message.meta.latencyMs}ms</span>}<span>{providerCost(message.meta.provider)}</span></div>}</article>)}
            </motion.div>
          )}

          <AnimatePresence>
            {activeCategory && <motion.div className="ai-suggestion-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}><div className="ai-suggestion-heading"><span>{copy.chat.suggestionLabel}</span><button type="button" onClick={() => setActiveCategory(null)} aria-label="Close"><X size={15} /></button></div>{copy.chat.suggestions[activeCategory].map((suggestion) => <button type="button" className="ai-suggestion-row" key={suggestion} onClick={() => chooseSuggestion(suggestion)}>{categories.find((category) => category.id === activeCategory)?.icon}<span>{suggestion}</span></button>)}</motion.div>}
          </AnimatePresence>

          <div className="ai-chat-bottom">
            <div className="ai-chat-category-row">{categories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "is-active" : ""} onClick={() => setActiveCategory((current) => current === category.id ? null : category.id)}>{category.icon}{category.label}</button>)}</div>
            <div className="ai-chat-tools"><button type="button" className={searchEnabled ? "is-active" : ""} onClick={() => setSearchEnabled((enabled) => !enabled)}><Search size={14} /> {copy.chat.search}</button><button type="button" className={researchEnabled ? "is-active" : ""} onClick={() => setResearchEnabled((enabled) => !enabled)}><Globe2 size={14} /> {copy.chat.research}</button><button type="button" className={reasonEnabled ? "is-active" : ""} onClick={() => setReasonEnabled((enabled) => !enabled)}><BrainCircuit size={14} /> {copy.chat.reason}</button></div>
            <AIChatInput key={composerSeed} defaultValue={composerValue} placeholder={copy.chat.promptPlaceholder} ariaLabel={copy.chat.promptAria} disabled={isSending} models={models} effortLabels={[copy.chat.effortLow, copy.chat.effortMedium, copy.chat.effortMax]} labels={{ send: copy.chat.send, addFile: copy.chat.addFile, removeFile: copy.chat.removeFile, model: copy.chat.model, effort: copy.chat.effort, modelMenu: copy.chat.modelMenu, comingSoon: copy.chat.modelSoon }} onSubmit={handleSubmit} />
            <div className="ai-chat-input-footnote"><span><Sparkles size={13} /> {copy.chat.modelNotice}</span><span>{copy.chat.voice}</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}
