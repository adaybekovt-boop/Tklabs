"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Check, Copy, PenLine, Square, Volume2 } from "lucide-react";

import {
  PromptInput,
  type ChatInputModel,
  type ChatInputSubmitMeta,
} from "@/components/ui/ai-chat-input";
import AIThinkingBlock from "@/components/ui/ai-thinking-block";
import { MobileHistory } from "@/components/playground/MobileHistory";
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

const MAX_PROVIDER_TTS_LENGTH = 10_000;

type SuggestionKind = "learn" | "write";
type Tone = "professional" | "character";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
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

function preferredBrowserVoice(locale: Locale) {
  const language = locale === "ru" ? "ru" : "en";
  return window.speechSynthesis.getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith(language))
    .sort((left, right) => {
      const score = (voice: SpeechSynthesisVoice) => {
        const name = voice.name.toLowerCase();
        return (voice.lang.toLowerCase() === `${language}-${language === "ru" ? "ru" : "us"}` ? 4 : 0)
          + (/natural|neural|premium|enhanced|google|microsoft/.test(name) ? 3 : 0)
          + (voice.localService ? 1 : 0);
      };
      return score(right) - score(left);
    })[0];
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
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [tone, setTone] = useState<Tone>("professional");
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [suggestionKind, setSuggestionKind] = useState<SuggestionKind | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speechMessageId, setSpeechMessageId] = useState<string | null>(null);
  const [speechNotice, setSpeechNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(uid());
  const activeRequestRef = useRef<AbortController | null>(null);
  const activeConversationRef = useRef<{ prompt: string; model: string; assistantId: string } | null>(null);
  const ttsRequestRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

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
    let cancelled = false;
    fetch("/api/tts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { available?: unknown };
        if (!cancelled) setTtsAvailable(payload.available === true);
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
      ttsRequestRef.current?.abort();
      releaseAudio();
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
    stopSpeech();
    router.replace("/playground");
  }

  function appendAssistant(assistantId: string, update: (message: Message) => Message) {
    setMessages((current) => current.map((message) => (message.id === assistantId ? update(message) : message)));
  }

  function stopGeneration() {
    const activeConversation = activeConversationRef.current;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    activeConversationRef.current = null;
    setMessages((current) => {
      const next = [...current];
      const targetIndex = activeConversation ? next.findIndex((message) => message.id === activeConversation.assistantId) : next.length - 1;
      const last = targetIndex >= 0 ? next[targetIndex] : undefined;
      if (last?.role === "assistant" && !last.content.endsWith("\n\n" + text.chat.generationStopped)) {
        next[targetIndex] = { ...last, content: last.content ? last.content + "\n\n" + text.chat.generationStopped : text.chat.generationStopped };
      }
      if (activeConversation) {
        saveSession({
          id: sessionIdRef.current,
          title: titleFrom(activeConversation.prompt),
          model: activeConversation.model,
          updatedAt: Date.now(),
          messages: next as ArchivedMessage[],
        });
      }
      return next;
    });
    setIsStreaming(false);
  }

  function releaseAudio() {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }

  function stopSpeech() {
    ttsRequestRef.current?.abort();
    ttsRequestRef.current = null;
    releaseAudio();
    window.speechSynthesis?.cancel();
    setSpeechMessageId(null);
  }

  function speakWithBrowser(message: Message) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechMessageId(null);
      setSpeechNotice(text.chat.voiceUnsupported);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message.content);
    const voice = preferredBrowserVoice(locale);
    if (voice) utterance.voice = voice;
    utterance.lang = locale === "ru" ? "ru-RU" : "en-US";
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onend = () => setSpeechMessageId((current) => current === message.id ? null : current);
    utterance.onerror = () => {
      setSpeechMessageId((current) => current === message.id ? null : current);
      setSpeechNotice(text.chat.speechFailed);
    };
    setSpeechMessageId(message.id);
    window.speechSynthesis.speak(utterance);
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

  async function speakMessage(message: Message) {
    setSpeechNotice("");
    if (!message.content.trim()) return;
    if (speechMessageId === message.id) {
      stopSpeech();
      return;
    }

    stopSpeech();
    if (!ttsAvailable || message.content.length > MAX_PROVIDER_TTS_LENGTH) {
      speakWithBrowser(message);
      return;
    }
    setSpeechMessageId(message.id);
    const controller = new AbortController();
    ttsRequestRef.current = controller;

    try {
      if (message.content.length <= MAX_PROVIDER_TTS_LENGTH) {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          signal: controller.signal,
          body: JSON.stringify({ text: message.content, locale }),
        });
        const contentType = response.headers.get("content-type") ?? "";
        if (response.ok && response.body && contentType.includes("audio/")) {
          const audioUrl = URL.createObjectURL(await response.blob());
          if (controller.signal.aborted) {
            URL.revokeObjectURL(audioUrl);
            return;
          }
          const audio = new Audio(audioUrl);
          audio.preload = "auto";
          audioRef.current = audio;
          audioUrlRef.current = audioUrl;
          audio.onended = () => {
            if (audioRef.current !== audio) return;
            releaseAudio();
            setSpeechMessageId((current) => current === message.id ? null : current);
          };
          audio.onerror = () => {
            if (audioRef.current !== audio) return;
            releaseAudio();
            speakWithBrowser(message);
          };
          try {
            await audio.play();
            return;
          } catch {
            if (audioRef.current === audio) releaseAudio();
            if (controller.signal.aborted) return;
          }
        } else if (response.body) {
          await response.body.cancel().catch(() => undefined);
        }
      }

      if (!controller.signal.aborted) speakWithBrowser(message);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!controller.signal.aborted) speakWithBrowser(message);
    } finally {
      if (ttsRequestRef.current === controller) ttsRequestRef.current = null;
    }
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
    activeConversationRef.current = { prompt, model: nextModelKey, assistantId };

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
      let assistantContent = "";

      const processEvent = (event: string) => {
        const line = event.split(/\r?\n/).find((entry) => entry.startsWith("data:"));
        if (!line) return;
        const data = line.slice(5).trim();
        if (!data) return;

        let payload: { token?: unknown };
        try {
          payload = JSON.parse(data) as { token?: unknown };
        } catch {
          return;
        }

        if (typeof payload.token === "string") {
          assistantContent += payload.token;
          appendAssistant(assistantId, (message) => ({ ...message, content: assistantContent }));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const event of events) processEvent(event);
      }

      buffer += decoder.decode();
      if (buffer.trim()) processEvent(buffer);

      setMessages((current) => {
        const next = current.map((message) => message.id === assistantId
          ? { ...message, content: assistantContent }
          : message,
        );
        saveSession({
          id: sessionIdRef.current,
          title: titleFrom(prompt),
          model: nextModelKey,
          updatedAt: Date.now(),
          messages: next as ArchivedMessage[],
        });
        return next;
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      appendAssistant(assistantId, (message) => ({ ...message, content: text.chat.networkError, error: true }));
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        activeConversationRef.current = null;
      }
      setIsStreaming(false);
    }
  }

  const lastMessage = messages[messages.length - 1];

  return (
    <>
      <header className="hairline-b flex h-16 flex-shrink-0 items-center justify-between gap-3 bg-white px-margin-mobile md:px-margin-desktop">
        <div className="flex min-w-0 items-center gap-2">
          <MobileHistory locale={locale} />
          <span className={cn("size-2 bg-primary transition-transform duration-500", isStreaming && "scale-150 animate-pulse")} />
          <span className="min-w-0 truncate text-[13px] leading-[1.4] text-on-secondary-container">
            {isStreaming ? text.chat.streaming : clodexAccess?.active ? text.chat.clodexReady : text.chat.ready}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {isStreaming && (
            <button type="button" onClick={stopGeneration} aria-label={text.chat.generationStopped} className="label-caps flex shrink-0 items-center gap-2 text-error transition-colors hover:text-primary">
              <Square size={12} />
              <span className="max-[420px]:hidden">{text.chat.generationStopped}</span>
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

      <div ref={scrollRef} className="relative flex-grow overflow-y-auto bg-white px-4 py-10 sm:px-margin-mobile sm:py-8 md:px-margin-desktop">
        {messages.length === 0 ? (
          <div className="chat-empty-enter mx-auto flex h-full min-h-[320px] w-full max-w-3xl flex-col justify-center pb-16">
            <p className="label-caps mb-5 text-on-secondary-container">{text.chat.emptyKicker}</p>
            <h2 className="mb-3 max-w-2xl font-serif text-[36px] leading-[1.2] text-primary md:text-[48px]">{text.chat.emptyTitle}</h2>
            <p className="max-w-xl text-[16px] leading-[1.6] text-on-secondary-container">{text.chat.emptyDescription}</p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 pb-10 md:gap-10 md:pb-8" aria-live="polite">
            {messages.map((message) =>
              message.role === "user" ? (
                <article key={message.id} className="chat-message-enter flex justify-end">
                  <div className="max-w-[92%] border border-outline-variant bg-surface-container-low px-5 py-4 sm:max-w-[82%] sm:px-6">
                    <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-primary">{message.content}</p>
                  </div>
                </article>
              ) : (
                <article key={message.id} className="chat-message-enter flex justify-start">
                  <div className={cn("max-w-[96%] border-l-2 py-3 pl-5 sm:max-w-[92%] sm:pl-6", message.error ? "border-error" : "border-primary")}>
                    <div className={cn("whitespace-pre-wrap text-[15px] leading-[1.75]", message.error ? "text-error" : "text-primary")}>
                      {message.content || (isStreaming ? <AIThinkingBlock label={text.chat.thinking} /> : null)}
                      {isStreaming && message.id === lastMessage?.id && message.content && <span className="streaming-caret ml-1 inline-block h-4 w-px bg-primary align-middle" />}
                    </div>
                    {message.content && !message.error && (message.id !== lastMessage?.id || !isStreaming) && (
                      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-outline-variant pt-3 text-[11px] text-on-secondary-container">
                        <button type="button" onClick={() => void copyMessage(message)} className="flex items-center gap-1.5 transition-colors hover:text-primary">
                          {copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}
                          {copiedMessageId === message.id ? text.chat.copied : text.chat.copy}
                        </button>
                        <button type="button" onClick={() => void speakMessage(message)} aria-pressed={speechMessageId === message.id} className="flex items-center gap-1.5 transition-colors hover:text-primary">
                          <Volume2 size={13} />
                          {speechMessageId === message.id ? text.chat.stopSpeaking : text.chat.speak}
                        </button>
                        {speechNotice && message.id === lastMessage?.id && <span className="text-error">{speechNotice}</span>}
                      </div>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>

      <div className="hairline-t safe-area-bottom w-full flex-shrink-0 bg-surface/95 px-4 pt-7 backdrop-blur-md sm:px-margin-mobile md:px-margin-desktop">
        <div className="mx-auto mb-4 flex max-w-[780px] gap-3 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          <button type="button" onClick={() => setSuggestionKind((current) => current === "learn" ? null : "learn")} className={cn("label-caps flex shrink-0 items-center gap-2 border border-outline-variant px-3 py-2.5 transition-colors hover:border-primary", suggestionKind === "learn" && "border-primary bg-surface-container-low")}>
            <BookOpen size={13} /> {text.chat.learn}
          </button>
          <button type="button" onClick={() => setSuggestionKind((current) => current === "write" ? null : "write")} className={cn("label-caps flex shrink-0 items-center gap-2 border border-outline-variant px-3 py-2.5 transition-colors hover:border-primary", suggestionKind === "write" && "border-primary bg-surface-container-low")}>
            <PenLine size={13} /> {text.chat.write}
          </button>
          <button type="button" onClick={() => setReasonEnabled((enabled) => !enabled)} className={cn("label-caps shrink-0 border border-outline-variant px-3 py-2.5 transition-colors hover:border-primary", reasonEnabled && "border-primary bg-surface-container-low")} aria-pressed={reasonEnabled}>
            {reasonEnabled ? text.chat.reasoningOn : text.chat.reasoningOff}
          </button>
          <button type="button" onClick={() => setTone((current) => current === "professional" ? "character" : "professional")} className={cn("label-caps shrink-0 border border-outline-variant px-3 py-2.5 transition-colors hover:border-primary", tone === "character" && "border-primary bg-surface-container-low")} aria-pressed={tone === "character"}>
            {tone === "professional" ? text.chat.toneProfessional : text.chat.toneCharacter}
          </button>
        </div>
        {suggestionKind && (
          <div className="mx-auto mb-4 max-w-[780px] border border-outline-variant bg-surface-container-low p-4">
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
