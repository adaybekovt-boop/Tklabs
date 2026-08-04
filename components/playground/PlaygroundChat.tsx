"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Check, Copy, Cpu, PenLine, Route, Square, Timer, Volume2 } from "lucide-react";

import {
  PromptInput,
  type ChatInputModel,
  type ChatInputSubmitMeta,
} from "@/components/ui/ai-chat-input";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { CLODEX_MODELS } from "@/lib/clodex-models";
import { DEFAULT_ERMA_MODEL_KEY, PRIVILEGED_MAX_PROMPT_LENGTH, PUBLIC_ERMA_MODELS, PUBLIC_MAX_PROMPT_LENGTH, type ErmaTier } from "@/lib/erma-public";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getSession, loadSettings, saveSession, type ArchivedMessage } from "@/lib/local-archive";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<ErmaTier, string> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

type SuggestionKind = "learn" | "write";
type Tone = "professional" | "character";

type Meta = {
  model: string;
  provider: string;
  providerModel?: string;
  latencyMs: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: Meta;
  error?: boolean;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

function titleFrom(prompt: string) {
  return prompt.length > 48 ? prompt.slice(0, 48) + "…" : prompt;
}

export function PlaygroundChat({ locale }: { locale: Locale }) {
  const text = getDictionary(locale);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [modelKey, setModelKey] = useState(DEFAULT_ERMA_MODEL_KEY);
  const [isStreaming, setIsStreaming] = useState(false);
  const [clodexAccess, setClodexAccess] = useState<ClodexAccessStatus | null>(null);
  const [tone, setTone] = useState<Tone>("professional");
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [suggestionKind, setSuggestionKind] = useState<SuggestionKind | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speechMessageId, setSpeechMessageId] = useState<string | null>(null);
  const [speechNotice, setSpeechNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(uid());
  const activeRequestRef = useRef<AbortController | null>(null);

  const ermaOptions: ChatInputModel[] = PUBLIC_ERMA_MODELS.map((model) => ({
    id: model.key,
    name: model.name,
    tierLabel: TIER_LABEL[model.tier],
    available: model.available,
  }));

  const clodexOptions: ChatInputModel[] = CLODEX_MODELS.map((model) => ({
    id: model.key,
    name: model.id,
    tierLabel: "Clodex",
    available: true,
  }));

  const models = clodexAccess?.active ? [...ermaOptions, ...clodexOptions] : ermaOptions;
  const promptLimit = clodexAccess?.unlimited ? PRIVILEGED_MAX_PROMPT_LENGTH : PUBLIC_MAX_PROMPT_LENGTH;

  const selectedModel = models.find((model) => model.id === modelKey) ?? models[0];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/access", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as ClodexAccessStatus;
        if (!cancelled) setClodexAccess(payload);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const savedTone = window.localStorage.getItem("tklabs.erma-tone");
    if (savedTone === "professional" || savedTone === "character") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTone(savedTone);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tklabs.erma-tone", tone);
  }, [tone]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    const sessionParam = searchParams.get("session");
    const modelParam = searchParams.get("model");

    if (sessionParam) {
      const saved = getSession(sessionParam);
      if (saved) {
        sessionIdRef.current = saved.id;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setModelKey(saved.model);
        setMessages(saved.messages as Message[]);
        return;
      }
    }

    if (modelParam && [...ermaOptions, ...clodexOptions].some((model) => model.id === modelParam)) {
      setModelKey(modelParam);
      return;
    }

    const defaultModel = loadSettings().defaultModel;
    if (defaultModel && ermaOptions.some((model) => model.id === defaultModel)) setModelKey(defaultModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function startNewDialog() {
    sessionIdRef.current = uid();
    setMessages([]);
    setInput("");
    setSuggestionKind(null);
    setCopiedMessageId(null);
    setSpeechNotice("");
    window.speechSynthesis?.cancel();
    setSpeechMessageId(null);
    router.replace("/playground");
  }

  function appendAssistant(assistantId: string, update: (message: Message) => Message) {
    setMessages((current) => current.map((message) => (message.id === assistantId ? update(message) : message)));
  }

  function stopGeneration() {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "assistant" && last.content && !last.content.endsWith("\n\n" + text.chat.generationStopped)) {
        next[next.length - 1] = { ...last, content: last.content + "\n\n" + text.chat.generationStopped };
      }
      return next;
    });
    setIsStreaming(false);
  }

  async function copyMessage(message: Message) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const area = document.createElement("textarea");
        area.value = message.content;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1600);
    } catch {
      setSpeechNotice(text.chat.copyFailed);
    }
  }

  function speakMessage(message: Message) {
    setSpeechNotice("");
    if (!message.content.trim()) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechNotice(text.chat.voiceUnsupported);
      return;
    }
    if (speechMessageId === message.id) {
      window.speechSynthesis.cancel();
      setSpeechMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = locale === "ru" ? "ru-RU" : "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 0.85;
    utterance.onend = () => setSpeechMessageId((current) => current === message.id ? null : current);
    utterance.onerror = () => {
      setSpeechMessageId((current) => current === message.id ? null : current);
      setSpeechNotice(text.chat.speechFailed);
    };
    setSpeechMessageId(message.id);
    window.speechSynthesis.speak(utterance);
  }

  function chooseSuggestion(suggestion: string) {
    setInput(suggestion);
    setSuggestionKind(null);
  }

  async function handleSubmit(prompt: string, submitMeta: ChatInputSubmitMeta) {
    if (!prompt || prompt.length > promptLimit || isStreaming) return;

    const nextModelKey = submitMeta.model;
    const userMessage: Message = { id: uid(), role: "user", content: prompt };
    const assistantId = uid();
    const controller = new AbortController();
    setModelKey(nextModelKey);
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setSuggestionKind(null);
    setIsStreaming(true);
    activeRequestRef.current = controller;

    try {
      const endpoint = nextModelKey.startsWith("clodex:") ? "/api/clodex" : "/api/demo";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          model: nextModelKey,
          locale,
          reason: reasonEnabled || submitMeta.effort !== "low",
          effort: submitMeta.effort,
          tone,
          attachments: submitMeta.attachments,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        const fallback = response.status === 401 ? text.chat.authExpired : text.chat.apiError + " " + response.status;
        const errorText = (payload as { error?: string } | null)?.error ?? fallback;
        appendAssistant(assistantId, (message) => ({ ...message, content: errorText, error: true }));
        return;
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

        for (const event of events) {
          const line = event.split(/\r?\n/).find((entry) => entry.startsWith("data:"));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (!data) continue;

          let payload: { token?: string; done?: boolean; meta?: Meta };
          try {
            payload = JSON.parse(data) as { token?: string; done?: boolean; meta?: Meta };
          } catch {
            continue;
          }

          if (typeof payload.token === "string") {
            appendAssistant(assistantId, (message) => ({ ...message, content: message.content + payload.token }));
          }
          if (payload.done) {
            setMessages((current) => {
              const next = current.map((message) => (message.id === assistantId ? { ...message, meta: payload.meta } : message));
              saveSession({
                id: sessionIdRef.current,
                title: titleFrom(prompt),
                model: nextModelKey,
                updatedAt: Date.now(),
                messages: next as ArchivedMessage[],
              });
              return next;
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      appendAssistant(assistantId, (message) => ({ ...message, content: text.chat.networkError, error: true }));
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
      setIsStreaming(false);
    }
  }

  const lastMessage = messages[messages.length - 1];
  const providerLabel = (provider: string) => provider === "nvidia" ? text.chat.providerNvidia : provider === "clodex" ? text.chat.providerClodex : text.chat.providerFallback;

  return (
    <>
      <header className="hairline-b flex h-16 flex-shrink-0 items-center justify-between bg-white px-margin-mobile md:px-margin-desktop">
        <div className="flex items-center gap-3">
          <span className={cn("size-2 bg-primary transition-transform duration-500", isStreaming && "scale-150 animate-pulse")} />
          <span className="text-[13px] leading-[1.4] text-on-secondary-container">
            {isStreaming ? text.chat.streaming : clodexAccess?.active ? text.chat.clodexReady : text.chat.ready}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isStreaming && (
            <button type="button" onClick={stopGeneration} className="label-caps flex items-center gap-2 text-error transition-colors hover:text-primary">
              <Square size={12} />
              {text.chat.generationStopped}
            </button>
          )}
          <button
            type="button"
            onClick={startNewDialog}
            disabled={messages.length === 0 || isStreaming}
            className="label-caps text-on-secondary-container transition-[color,transform] duration-200 hover:-translate-y-px hover:text-primary disabled:pointer-events-none disabled:opacity-30"
          >
            {text.chat.newDialog}
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="relative flex-grow overflow-y-auto bg-white px-margin-mobile py-8 md:px-margin-desktop">
        {messages.length === 0 ? (
          <div className="chat-empty-enter mx-auto flex h-full min-h-[320px] w-full max-w-3xl flex-col justify-center pb-16">
            <p className="label-caps mb-5 text-on-secondary-container">{text.chat.emptyKicker}</p>
            <h2 className="mb-3 max-w-2xl font-serif text-[36px] leading-[1.2] text-primary md:text-[48px]">{text.chat.emptyTitle}</h2>
            <p className="max-w-xl text-[16px] leading-[1.6] text-on-secondary-container">{text.chat.emptyDescription}</p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 pb-8" aria-live="polite">
            {messages.map((message) =>
              message.role === "user" ? (
                <article key={message.id} className="chat-message-enter flex justify-end">
                  <div className="max-w-[82%] border border-outline-variant bg-surface-container-low px-6 py-4">
                    <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-primary">{message.content}</p>
                  </div>
                </article>
              ) : (
                <article key={message.id} className="chat-message-enter flex justify-start">
                  <div className={cn("max-w-[92%] border-l-2 py-2 pl-6", message.error ? "border-error" : "border-primary")}>
                    <div className={cn("whitespace-pre-wrap text-[15px] leading-[1.75]", message.error ? "text-error" : "text-primary")}>
                      {message.content || (isStreaming ? <span className="streaming-dots" aria-label={text.chat.streaming}><i /><i /><i /></span> : null)}
                      {isStreaming && message.content && <span className="streaming-caret ml-1 inline-block h-4 w-px bg-primary align-middle" />}
                    </div>
                    {message.content && !message.error && (message.id !== lastMessage?.id || !isStreaming) && (
                      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-outline-variant pt-3 text-[11px] text-on-secondary-container">
                        <button type="button" onClick={() => void copyMessage(message)} className="flex items-center gap-1.5 transition-colors hover:text-primary">
                          {copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}
                          {copiedMessageId === message.id ? text.chat.copied : text.chat.copy}
                        </button>
                        <button type="button" onClick={() => speakMessage(message)} className="flex items-center gap-1.5 transition-colors hover:text-primary">
                          <Volume2 size={13} />
                          {speechMessageId === message.id ? text.chat.stopSpeaking : text.chat.speak}
                        </button>
                        {speechNotice && message.id === lastMessage?.id && <span className="text-error">{speechNotice}</span>}
                      </div>
                    )}
                    {message.meta && (
                      <div className="response-meta-enter mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-outline-variant pt-4 text-[11px] text-on-secondary-container">
                        <span className="flex items-center gap-1.5"><Route size={13} /> {providerLabel(message.meta.provider)}</span>
                        <span className="flex items-center gap-1.5"><Cpu size={13} /> {message.meta.model}</span>
                        <span className="flex items-center gap-1.5"><Timer size={13} /> {message.meta.latencyMs} {text.status.ms}</span>
                      </div>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>

      <div className="hairline-t w-full flex-shrink-0 bg-white/95 px-margin-mobile py-5 backdrop-blur-md md:px-margin-desktop">
        <div className="mx-auto mb-3 flex max-w-[780px] flex-wrap items-center gap-2">
          <button type="button" onClick={() => setSuggestionKind((current) => current === "learn" ? null : "learn")} className={cn("label-caps flex items-center gap-2 border border-outline-variant px-3 py-2 transition-colors hover:border-primary", suggestionKind === "learn" && "border-primary bg-surface-container-low")}>
            <BookOpen size={13} /> {text.chat.learn}
          </button>
          <button type="button" onClick={() => setSuggestionKind((current) => current === "write" ? null : "write")} className={cn("label-caps flex items-center gap-2 border border-outline-variant px-3 py-2 transition-colors hover:border-primary", suggestionKind === "write" && "border-primary bg-surface-container-low")}>
            <PenLine size={13} /> {text.chat.write}
          </button>
          <button type="button" onClick={() => setReasonEnabled((enabled) => !enabled)} className={cn("label-caps border border-outline-variant px-3 py-2 transition-colors hover:border-primary", reasonEnabled && "border-primary bg-surface-container-low")} aria-pressed={reasonEnabled}>
            {reasonEnabled ? text.chat.reasoningOn : text.chat.reasoningOff}
          </button>
          <button type="button" onClick={() => setTone((current) => current === "professional" ? "character" : "professional")} className={cn("label-caps border border-outline-variant px-3 py-2 transition-colors hover:border-primary", tone === "character" && "border-primary bg-surface-container-low")} aria-pressed={tone === "character"}>
            {tone === "professional" ? text.chat.toneProfessional : text.chat.toneCharacter}
          </button>
        </div>
        {suggestionKind && (
          <div className="mx-auto mb-3 max-w-[780px] border border-outline-variant bg-surface-container-low p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label-caps text-on-secondary-container">{suggestionKind === "learn" ? text.chat.suggestionLearn : text.chat.suggestionWrite}</span>
              <button type="button" onClick={() => setSuggestionKind(null)} className="text-[11px] text-on-secondary-container hover:text-primary">{text.chat.close}</button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {text.chat.suggestions[suggestionKind].map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => chooseSuggestion(suggestion)} className="border border-outline-variant bg-white px-3 py-3 text-left text-[12px] leading-[1.4] transition-colors hover:border-primary">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          models={models}
          selectedModelId={selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY}
          onModelChange={setModelKey}
          disabled={isStreaming}
          maxLength={promptLimit}
          placeholder={text.chat.promptPlaceholder}
          attachmentsEnabled
          labels={text.chat.input}
          voiceLanguage={locale === "ru" ? "ru-RU" : "en-US"}
        />
      </div>
    </>
  );
}
