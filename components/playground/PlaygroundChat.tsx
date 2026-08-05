"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Square } from "lucide-react";

import { MobileHistory } from "@/components/playground/MobileHistory";
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
type Tone = "professional" | "character";

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

  const ermaOptions: ChatInputModel[] = PUBLIC_ERMA_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: TIER_LABEL[model.tier], available: model.available }));
  const clodexOptions: ChatInputModel[] = CLODEX_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: "Clodex", available: true }));
  const models = clodexAccess?.active ? [...ermaOptions, ...clodexOptions] : ermaOptions;
  const promptLimit = clodexAccess?.unlimited ? PRIVILEGED_MAX_PROMPT_LENGTH : PUBLIC_MAX_PROMPT_LENGTH;
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
    if (savedTone === "professional" || savedTone === "character") {
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
  }, []);

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
      <header className="hairline-b flex h-16 flex-shrink-0 items-center justify-between gap-3 bg-white px-margin-mobile md:px-margin-desktop">
        <div className="flex min-w-0 items-center gap-2">
          <MobileHistory locale={locale} />
          <span className={cn("size-2 bg-primary transition-transform duration-500", chat.isPending && "scale-150 animate-pulse")} />
          <span className="min-w-0 truncate text-[13px] leading-[1.4] text-on-secondary-container">{chat.isPending ? text.chat.streaming : clodexAccess?.active ? text.chat.clodexReady : text.chat.ready}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {chat.isPending && (
            <button type="button" onClick={chat.stopGeneration} aria-label={text.chat.generationStopped} className="label-caps flex shrink-0 items-center gap-2 text-error transition-colors hover:text-primary">
              <Square size={12} />
              <span className="max-[420px]:hidden">{text.chat.generationStopped}</span>
            </button>
          )}
          <button type="button" onClick={startNewDialog} disabled={chat.messages.length === 0 || chat.isPending} className="label-caps text-on-secondary-container transition-[color,transform] duration-200 hover:-translate-y-px hover:text-primary disabled:pointer-events-none disabled:opacity-30">{text.chat.newDialog}</button>
        </div>
      </header>

      <div ref={scrollRef} className="relative flex-grow overflow-y-auto bg-white px-4 py-10 sm:px-margin-mobile sm:py-8 md:px-margin-desktop">
        {chat.messages.length === 0 ? (
          <div className="chat-empty-enter mx-auto flex h-full min-h-[320px] w-full max-w-3xl flex-col justify-center pb-16">
            <p className="label-caps mb-5 text-on-secondary-container">{text.chat.emptyKicker}</p>
            <h2 className="mb-3 max-w-2xl font-serif text-[36px] leading-[1.2] text-primary md:text-[48px]">{text.chat.emptyTitle}</h2>
            <p className="max-w-xl text-[16px] leading-[1.6] text-on-secondary-container">{text.chat.emptyDescription}</p>
          </div>
        ) : (
          <MessageList messages={chat.messages} isPending={chat.isPending} locale={locale} text={text} copiedMessageId={speech.copiedMessageId} speakingMessageId={speech.speechMessageId} speechNotice={speech.speechNotice} onCopy={(message) => void speech.copyMessage(message)} onSpeak={(message) => void speech.speakMessage(message)} />
        )}
      </div>

      <div className="hairline-t safe-area-bottom w-full flex-shrink-0 bg-surface/95 px-4 pt-7 backdrop-blur-md sm:px-margin-mobile md:px-margin-desktop">
        <ChatToolbar text={text} suggestionKind={suggestionKind} reasonEnabled={reasonEnabled} tone={tone} onSuggestion={(kind) => setSuggestionKind((current) => current === kind ? null : kind)} onReason={() => setReasonEnabled((enabled) => !enabled)} onTone={() => setTone((current) => current === "professional" ? "character" : "professional")} />
        {suggestionKind && <SuggestionPanel text={text} kind={suggestionKind} onClose={() => setSuggestionKind(null)} onChoose={(suggestion) => { setInput(suggestion); setSuggestionKind(null); }} />}
        <PromptInput value={input} onChange={setInput} onSubmit={chat.handleSubmit} models={models} selectedModelId={selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY} onModelChange={setModelKey} disabled={chat.isPending} maxLength={promptLimit} placeholder={text.chat.promptPlaceholder} attachmentsEnabled maxAttachmentBytes={clodexAccess?.unlimited ? 64 * 1024 : 16 * 1024} maxAttachmentContextLength={clodexAccess?.unlimited ? 32_000 : 8_000} labels={text.chat.input} voiceLanguage={locale === "ru" ? "ru-RU" : "en-US"} />
      </div>
    </>
  );
}
