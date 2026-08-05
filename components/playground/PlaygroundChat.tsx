"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Square, SquarePen } from "lucide-react";

import { HistoryDropdown } from "@/components/playground/HistoryDropdown";
import { MessageList } from "@/components/playground/MessageList";
import { ChatToolbar } from "@/components/playground/ChatToolbar";
import { SuggestionPanel } from "@/components/playground/SuggestionPanel";
import { PromptInput, type ChatInputModel } from "@/components/ui/ai-chat-input";
import { useChatRequest } from "@/hooks/use-chat-request";
import { useConversationArchive } from "@/hooks/use-conversation-archive";
import { useSpeech } from "@/hooks/use-speech";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { CLODEX_MODELS } from "@/lib/models/clodex-public";
import { DEFAULT_ERMA_MODEL_KEY, PRIVILEGED_MAX_PROMPT_LENGTH, PUBLIC_ERMA_MODELS, PUBLIC_MAX_PROMPT_LENGTH, type ErmaTier } from "@/lib/models/public";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getSession, loadSettings } from "@/lib/local-archive";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<ErmaTier, string> = { light: "Light", medium: "Medium", heavy: "Heavy" };
type SuggestionKind = "learn" | "write";
type Tone = "professional" | "character" | "erma";

const NEXT_TONE: Record<Tone, Tone> = {
  professional: "character",
  character: "erma",
  erma: "professional",
};

export function PlaygroundChat({ locale }: { locale: Locale }) {
  const text = getDictionary(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [modelKey, setModelKey] = useState(DEFAULT_ERMA_MODEL_KEY);
  const [clodexAccess, setClodexAccess] = useState<ClodexAccessStatus | null>(null);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [tone, setTone] = useState<Tone>("professional");
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [suggestionKind, setSuggestionKind] = useState<SuggestionKind | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const localPreview = process.env.NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW === "true";
  const modelMark = "/images/models/model-mark.png";
  const ermaOptions: ChatInputModel[] = PUBLIC_ERMA_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: TIER_LABEL[model.tier], available: model.available, markSrc: modelMark }));
  const clodexOptions: ChatInputModel[] = CLODEX_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: "Clodex", available: true, markSrc: modelMark }));
  const models = clodexAccess?.active || localPreview ? [...ermaOptions, ...clodexOptions] : ermaOptions;
  const promptLimit = clodexAccess?.unlimited ? PRIVILEGED_MAX_PROMPT_LENGTH : localPreview ? PRIVILEGED_MAX_PROMPT_LENGTH : PUBLIC_MAX_PROMPT_LENGTH;
  const selectedModel = models.find((model) => model.id === modelKey) ?? models[0];
  const archive = useConversationArchive();
  const chat = useChatRequest({ locale, tone, reasonEnabled, promptLimit, saveConversation: archive.save });
  const speech = useSpeech(locale, ttsAvailable, {
    voiceUnsupported: text.chat.voiceUnsupported,
    speechFailed: text.chat.speechFailed,
    copyFailed: text.chat.copyFailed,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/access", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as ClodexAccessStatus;
        if (!cancelled) setClodexAccess(payload);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const savedTone = window.localStorage.getItem("tklabs.erma-tone");
    if (savedTone === "professional" || savedTone === "character" || savedTone === "erma") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTone(savedTone);
    }
  }, []);

  useEffect(() => { window.localStorage.setItem("tklabs.erma-tone", tone); }, [tone]);

  useEffect(() => {
    const sessionParam = searchParams.get("session");
    const modelParam = searchParams.get("model");
    if (sessionParam) {
      const saved = getSession(sessionParam);
      if (saved) {
        archive.setSessionId(saved.id);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setModelKey(saved.model);
        chat.setMessages(saved.messages);
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
  }, [searchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages]);

  function startNewDialog() {
    archive.reset();
    chat.clearMessages();
    setInput("");
    setSuggestionKind(null);
    speech.stopSpeech();
    router.replace("/playground");
  }

  return (
    <>
      <header className="playground-header hairline-b flex min-h-20 flex-shrink-0 items-center justify-between gap-3 bg-surface/85 px-margin-mobile backdrop-blur-md md:px-margin-desktop">
        <div className="flex min-w-0 items-center gap-3">
          <HistoryDropdown locale={locale} />
          <div className="min-w-0">
            <p className="label-caps hidden text-on-secondary-container sm:block">TK LAB · AI CHAT</p>
            <div className="flex items-center gap-2">
              <span className={cn("chat-status-dot size-2.5 rounded-full bg-primary transition-transform duration-500", chat.isPending && "scale-150 animate-pulse")} />
              <span className="min-w-0 truncate text-[13px] leading-[1.4] text-on-secondary-container">{chat.isPending ? text.chat.streaming : clodexAccess?.active || localPreview ? text.chat.clodexReady : text.chat.ready}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {chat.isPending && (
            <button type="button" onClick={chat.stopGeneration} aria-label={text.chat.generationStopped} className="chat-control-button label-caps flex shrink-0 items-center gap-2 rounded-full border border-error/50 px-3 py-2 text-error transition-colors hover:border-error hover:bg-error/10 hover:text-error">
              <Square size={12} />
              <span className="max-[420px]:hidden">{text.chat.generationStopped}</span>
            </button>
          )}
          <button type="button" onClick={startNewDialog} disabled={chat.messages.length === 0 || chat.isPending} className="chat-new-button label-caps flex items-center gap-2 rounded-full border border-outline-variant px-3 py-2 text-on-secondary-container transition-[background-color,color,transform] duration-200 hover:-translate-y-px hover:border-primary hover:bg-surface-container-low hover:text-primary disabled:pointer-events-none disabled:opacity-30">
            <SquarePen size={14} />
            <span className="max-[420px]:hidden">{text.chat.newDialog}</span>
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="playground-transcript relative flex-grow overflow-y-auto px-4 py-8 sm:px-margin-mobile sm:py-10 md:px-margin-desktop">
        {chat.messages.length === 0 ? (
          <div className="chat-empty-enter mx-auto flex h-full min-h-[320px] w-full max-w-3xl items-center justify-center pb-8">
            <div className="chat-empty-card w-full rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_24px_80px_color-mix(in_srgb,var(--color-primary)_7%,transparent)] sm:p-10">
              <div className="mb-7 flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-2.5">
                <img src="/images/models/model-mark.png" alt="" className="size-full object-contain" />
              </div>
              <p className="label-caps mb-4 text-on-secondary-container">{text.chat.emptyKicker}</p>
              <h2 className="mb-3 max-w-2xl font-serif text-[36px] leading-[1.12] text-primary md:text-[48px]">{text.chat.emptyTitle}</h2>
              <p className="max-w-xl text-[16px] leading-[1.65] text-on-secondary-container">{text.chat.emptyDescription}</p>
            </div>
          </div>
        ) : (
          <MessageList messages={chat.messages} isPending={chat.isPending} locale={locale} text={text} copiedMessageId={speech.copiedMessageId} speakingMessageId={speech.speechMessageId} speechNotice={speech.speechNotice} onCopy={(message) => void speech.copyMessage(message)} onSpeak={(message) => void speech.speakMessage(message)} />
        )}
      </div>

      <div className="chat-composer-area hairline-t safe-area-bottom w-full flex-shrink-0 bg-surface/88 px-4 pt-6 backdrop-blur-md sm:px-margin-mobile md:px-margin-desktop">
        <ChatToolbar text={text} suggestionKind={suggestionKind} reasonEnabled={reasonEnabled} tone={tone} onSuggestion={(kind) => setSuggestionKind((current) => current === kind ? null : kind)} onReason={() => setReasonEnabled((enabled) => !enabled)} onTone={() => setTone((current) => NEXT_TONE[current])} />
        {suggestionKind && <SuggestionPanel text={text} kind={suggestionKind} onClose={() => setSuggestionKind(null)} onChoose={(suggestion) => { setInput(suggestion); setSuggestionKind(null); }} />}
        <PromptInput value={input} onChange={setInput} onSubmit={chat.handleSubmit} models={models} selectedModelId={selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY} onModelChange={setModelKey} disabled={chat.isPending} maxLength={promptLimit} placeholder={text.chat.promptPlaceholder} attachmentsEnabled maxAttachmentBytes={clodexAccess?.unlimited ? 64 * 1024 : 16 * 1024} maxAttachmentContextLength={clodexAccess?.unlimited ? 32_000 : 8_000} labels={text.chat.input} voiceLanguage={locale === "ru" ? "ru-RU" : "en-US"} />
      </div>
    </>
  );
}
