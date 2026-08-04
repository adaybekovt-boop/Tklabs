"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  BrainCircuit,
  Check,
  Copy,
  Globe2,
  Home,
  MessageSquarePlus,
  PenLine,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
  X,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { AIChatInput, type ChatModelOption, type ChatSubmitMeta } from "@/components/ui/ai-chat-input";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { CLODEX_MODELS } from "@/lib/clodex-models";
import { ERMA_MODELS, normalizeErmaTone, type ErmaTone } from "@/lib/models";

type CommandCategory = "learn" | "write";
type ProviderMeta = { provider?: string; model: string; providerModel?: string; latencyMs?: number; cost?: string };
type Message = { id: string; role: "user" | "assistant"; text: string; meta?: ProviderMeta };
type ChatSession = { id: string; title: string; updatedAt: number; tone: ErmaTone; messages: Message[] };
type AccessPayload = ClodexAccessStatus & { error?: string };
type AccountSummary = { name: string; email: string; image: string | null };
type SpeechState = { messageId: string | null; status: "idle" | "speaking" | "paused" };

const MAX_CHAT_SESSIONS = 12;
const MAX_STORED_MESSAGES = 40;
const MAX_STORED_MESSAGE_CHARS = 24000;

function createChatId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function messagesForStorage(messages: Message[]) {
  let remaining = MAX_STORED_MESSAGE_CHARS;
  return messages.slice(-MAX_STORED_MESSAGES).map((message) => {
    const text = message.text.slice(0, Math.max(0, remaining));
    remaining -= text.length;
    return { ...message, text };
  }).filter((message) => message.text || message.role === "user");
}

function titleForMessages(messages: Message[], fallback: string) {
  const prompt = messages.find((message) => message.role === "user")?.text.trim().replace(/\s+/g, " ");
  return prompt ? prompt.slice(0, 52) : fallback;
}

function readChatSessions(raw: string | null): ChatSession[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const candidate = value as Partial<ChatSession>;
      if (typeof candidate.id !== "string" || !Array.isArray(candidate.messages)) return [];
      const messages = candidate.messages.flatMap((message) => {
        if (!message || typeof message !== "object") return [];
        const item = message as Partial<Message>;
        if ((item.role !== "user" && item.role !== "assistant") || typeof item.text !== "string") return [];
        return [{ id: typeof item.id === "string" ? item.id : `${candidate.id}-${Math.random()}`, role: item.role, text: item.text.slice(0, MAX_STORED_MESSAGE_CHARS), meta: item.meta }];
      });
      return [{
        id: candidate.id,
        title: typeof candidate.title === "string" ? candidate.title.slice(0, 60) : "Chat",
        updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
        tone: normalizeErmaTone(candidate.tone),
        messages: messagesForStorage(messages),
      }];
    }).slice(0, MAX_CHAT_SESSIONS);
  } catch {
    return [];
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "TK";
}

export function AIAssistantInterface({ account }: { account: AccountSummary }) {
  const { copy, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const historyStorageKey = `tklabs.chat-history.v1:${account.email.trim().toLowerCase() || "guest"}`;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("current");
  const [historyReady, setHistoryReady] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CommandCategory | null>(null);
  const [composerSeed, setComposerSeed] = useState(0);
  const [composerValue, setComposerValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [ermaTone, setErmaTone] = useState<ErmaTone>("professional");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [clodexAccess, setClodexAccess] = useState<ClodexAccessStatus | null>(null);
  const [speechState, setSpeechState] = useState<SpeechState>({ messageId: null, status: "idle" });
  const [speechNotice, setSpeechNotice] = useState<{ messageId: string; text: string } | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedTone = window.localStorage.getItem("tklabs.erma-tone");
    if (savedTone !== "professional" && savedTone !== "character" && savedTone !== "doubutsi") return;
    const frame = window.requestAnimationFrame(() => setErmaTone(savedTone));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const storedSessions = readChatSessions(window.localStorage.getItem(historyStorageKey));
      setSessions(storedSessions);
      const latest = storedSessions[0];
      if (latest) {
        setActiveChatId(latest.id);
        setMessages(latest.messages);
        setErmaTone(latest.tone);
      }
      setHistoryReady(true);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [historyStorageKey]);

  useEffect(() => {
    window.localStorage.setItem("tklabs.erma-tone", ermaTone);
  }, [ermaTone]);

  useEffect(() => {
    if (!historyReady || !messages.length) return;
    const timer = window.setTimeout(() => {
      const storedMessageSet = messagesForStorage(messages);
      setSessions((current) => {
        const next = [{
          id: activeChatId,
          title: titleForMessages(storedMessageSet, copy.chat.session),
          updatedAt: Date.now(),
          tone: ermaTone,
          messages: storedMessageSet,
        }, ...current.filter((session) => session.id !== activeChatId)].slice(0, MAX_CHAT_SESSIONS);
        window.localStorage.setItem(historyStorageKey, JSON.stringify(next));
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeChatId, copy.chat.session, ermaTone, historyReady, historyStorageKey, messages]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

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

  const stopSpeech = () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    speechUtteranceRef.current = null;
    setSpeechState({ messageId: null, status: "idle" });
  };

  const speakMessage = (message: Message) => {
    if (!message.text.trim()) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechNotice({ messageId: message.id, text: copy.chat.voiceUnsupported });
      return;
    }

    if (speechState.messageId === message.id && speechState.status === "speaking") {
      window.speechSynthesis.pause();
      setSpeechState({ messageId: message.id, status: "paused" });
      return;
    }
    if (speechState.messageId === message.id && speechState.status === "paused") {
      window.speechSynthesis.resume();
      setSpeechState({ messageId: message.id, status: "speaking" });
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text);
    const languagePrefix = language === "ru" ? "ru" : "en";
    const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang.toLowerCase().startsWith(languagePrefix));
    if (voice) utterance.voice = voice;
    utterance.lang = language === "ru" ? "ru-RU" : "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 0.62;
    utterance.volume = 1;
    speechUtteranceRef.current = utterance;
    setSpeechNotice(null);
    setSpeechState({ messageId: message.id, status: "speaking" });
    utterance.onstart = () => {
      if (speechUtteranceRef.current === utterance) setSpeechState({ messageId: message.id, status: "speaking" });
    };
    utterance.onend = () => {
      if (speechUtteranceRef.current !== utterance) return;
      speechUtteranceRef.current = null;
      setSpeechState({ messageId: null, status: "idle" });
    };
    utterance.onerror = () => {
      if (speechUtteranceRef.current !== utterance) return;
      speechUtteranceRef.current = null;
      setSpeechState({ messageId: null, status: "idle" });
      setSpeechNotice({ messageId: message.id, text: copy.chat.voiceUnsupported });
    };
    window.speechSynthesis.speak(utterance);
  };

  const copyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1600);
    } catch {
      // Clipboard access can be unavailable on non-secure local pages.
    }
  };

  const stopGeneration = () => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "assistant" && !last.text.endsWith(copy.chat.generationStopped)) {
        next[next.length - 1] = { ...last, text: last.text ? `${last.text}\n\n${copy.chat.generationStopped}` : copy.chat.generationStopped };
      }
      return next;
    });
    setIsSending(false);
  };

  const cancelGeneration = () => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setIsSending(false);
  };

  async function handleSubmit(prompt: string, meta: ChatSubmitMeta) {
    stopSpeech();
    const stamp = createChatId();
    const userMessage: Message = { id: stamp + "-user", role: "user", text: prompt };
    const assistantMessage: Message = { id: stamp + "-assistant", role: "assistant", text: "" };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setIsSending(true);
    setActiveCategory(null);
    setComposerValue("");
    window.dispatchEvent(new CustomEvent("facility:demo-start"));
    const controller = new AbortController();
    activeRequestRef.current = controller;

    try {
      const endpoint = meta.model.startsWith("clodex:") ? "/api/clodex" : "/api/demo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          locale: language,
          model: meta.model,
          tone: ermaTone,
          effort: meta.effort,
          attachments: meta.attachments,
          reason: reasonEnabled || meta.effort === "high",
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
          try {
            const payload = JSON.parse(line.slice(6)) as { token?: string; done?: boolean; meta?: ProviderMeta };
            if (payload.token) appendToLastAssistant((message) => ({ ...message, text: message.text + payload.token }));
            if (payload.meta) appendToLastAssistant((message) => ({ ...message, meta: payload.meta }));
          } catch {
            // Ignore malformed keep-alive chunks without breaking the conversation.
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const errorText = error instanceof Error && error.message ? error.message : copy.chat.apiError;
      appendToLastAssistant((message) => ({ ...message, text: errorText }));
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
      setIsSending(false);
    }
  }

  const chooseSuggestion = (suggestion: string) => {
    setComposerValue(suggestion);
    setComposerSeed((seed) => seed + 1);
  };

  const startNewChat = () => {
    stopSpeech();
    cancelGeneration();
    setActiveChatId(createChatId());
    setMessages([]);
    setActiveCategory(null);
    setComposerValue("");
    setComposerSeed((seed) => seed + 1);
  };

  const selectChat = (session: ChatSession) => {
    stopSpeech();
    cancelGeneration();
    setActiveChatId(session.id);
    setMessages(session.messages);
    setErmaTone(session.tone);
    setActiveCategory(null);
    setComposerValue("");
    setComposerSeed((seed) => seed + 1);
  };

  const cycleErmaTone = () => {
    setErmaTone((tone) => {
      const tones: ErmaTone[] = ["professional", "character", "doubutsi"];
      return tones[(tones.indexOf(tone) + 1) % tones.length];
    });
  };

  const toneLabel = ermaTone === "professional"
    ? copy.chat.professionalMode
    : ermaTone === "character"
      ? copy.chat.characterMode
      : copy.chat.doubutsiMode;

  const providerLabel = (provider?: string) => provider === "nvidia" ? copy.chat.nvidia : provider === "clodex" ? copy.chat.clodex : copy.chat.edgeFallback;
  const providerCost = (provider?: string) => provider === "edge-fallback" ? copy.chat.localCost : copy.chat.providerBilled;
  const accountInitials = initials(account.name);

  return (
    <div className="ai-chat-interface">
      <aside className="ai-chat-sidebar">
        <Link className="ai-sidebar-brand" href="/" aria-label="Imaginary Intelligence">
          <span className="ai-sidebar-mark"><Image src="/tk-logo.png" alt="" width={24} height={24} unoptimized /></span>
          <span><strong>TK LABS</strong><small>{copy.nav.aiChats}</small></span>
        </Link>

        <button type="button" className="ai-new-chat-button" onClick={startNewChat}>
          <MessageSquarePlus size={15} />
          <span>{copy.chat.newChat}</span>
          <kbd>⌘K</kbd>
        </button>

        <div className="ai-sidebar-section-label">{copy.chat.history}</div>
        {sessions.length ? sessions.map((session) => (
          <button type="button" className={"ai-history-item" + (session.id === activeChatId ? " is-active" : "")} onClick={() => selectChat(session)} key={session.id}>
            <span className="status-dot" />
            <span>
              <strong>{session.title}</strong>
              <small>{new Date(session.updatedAt).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US")} · {session.messages.length} {copy.chat.response.toLowerCase()}</small>
            </span>
          </button>
        )) : <p className="ai-history-empty">{copy.chat.noHistory}</p>}
        <p className="ai-history-local-note">{copy.chat.historyLocal}</p>

        <div className="ai-sidebar-spacer" />

        <div className="ai-sidebar-account">
          <Link className="ai-sidebar-profile" href="/profile">
            <span className="ai-account-avatar">
              {account.image ? <Image src={account.image} alt="" width={34} height={34} unoptimized referrerPolicy="no-referrer" /> : accountInitials}
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
            <Image className="ai-mobile-logo" src="/tk-logo.png" alt="" width={24} height={24} unoptimized />
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
              {account.image ? <Image src={account.image} alt="" width={28} height={28} unoptimized referrerPolicy="no-referrer" /> : <UserRound size={14} />}
            </Link>
          </div>
        </header>

        <div className="ai-chat-content">
          <div className="ai-conversation-scroll" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ai-empty-state">
                <div className="ai-empty-portrait">
                  <Image src="/erma-model.png" alt="Erma AI" width={96} height={96} unoptimized />
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
                          ? <Image src="/erma-model.png" alt="Erma AI" width={42} height={42} unoptimized />
                          : account.image
                            ? <Image src={account.image} alt="" width={42} height={42} unoptimized referrerPolicy="no-referrer" />
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
                      {message.role === "assistant" && message.text && (
                        <div className="ai-message-actions">
                          <button type="button" className="ai-message-copy-button" onClick={() => void copyMessage(message)} aria-label={copiedMessageId === message.id ? copy.chat.responseCopied : copy.chat.copyResponse}>
                            {copiedMessageId === message.id ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedMessageId === message.id ? copy.chat.responseCopied : copy.chat.copyResponse}</span>
                          </button>
                          <button
                            type="button"
                            className={"ai-voice-button" + (speechState.messageId === message.id ? " is-active" : "")}
                            onClick={() => speakMessage(message)}
                            aria-label={speechState.messageId === message.id && speechState.status === "speaking"
                              ? copy.chat.pauseSpeech
                              : speechState.messageId === message.id && speechState.status === "paused"
                                ? copy.chat.resumeSpeech
                                : copy.chat.speak}
                          >
                            <span className="ai-pixel-voice" aria-hidden="true"><i /><i /><i /><i /></span>
                            {speechState.messageId === message.id && speechState.status === "speaking"
                              ? copy.chat.pauseSpeech
                              : speechState.messageId === message.id && speechState.status === "paused"
                                ? copy.chat.resumeSpeech
                                : copy.chat.speak}
                          </button>
                          {speechState.messageId === message.id && (
                            <button type="button" className="ai-voice-stop-button" onClick={stopSpeech} aria-label={copy.chat.stopSpeech}>
                              <Square size={12} />
                              <span>{copy.chat.stopSpeech}</span>
                            </button>
                          )}
                          {speechNotice?.messageId === message.id && <span className="ai-voice-notice" role="status">{speechNotice.text}</span>}
                        </div>
                      )}
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
                <button type="button" className={reasonEnabled ? "is-active" : ""} aria-pressed={reasonEnabled} onClick={() => setReasonEnabled((enabled) => !enabled)}><BrainCircuit size={13} /> {copy.chat.reason}</button>
                <button type="button" className={ermaTone === "professional" ? "" : `is-active ${ermaTone === "doubutsi" ? "is-doubutsi" : ""}`} aria-pressed={ermaTone !== "professional"} onClick={cycleErmaTone}><Sparkles size={13} /> {toneLabel}</button>
                {isSending && <button type="button" className="ai-stop-generation-button" onClick={stopGeneration}><Square size={13} /> {copy.chat.stopGeneration}</button>}
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
                  voice: copy.chat.voice,
                  voiceInput: copy.chat.voiceInput,
                  voiceStopInput: copy.chat.voiceStopInput,
                  voiceListening: copy.chat.voiceListening,
                  voiceUnsupported: copy.chat.voiceUnsupported,
                  voiceDenied: copy.chat.voiceDenied,
                }}
                voiceLanguage={language === "ru" ? "ru-RU" : "en-US"}
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
