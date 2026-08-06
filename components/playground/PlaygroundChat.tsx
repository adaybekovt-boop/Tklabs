"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, SquarePen } from "lucide-react";

import { ConversationArchive } from "@/components/playground/ConversationArchive";
import { HistoryDropdown } from "@/components/playground/HistoryDropdown";
import { MessageList, type ChatMessage } from "@/components/playground/MessageList";
import { ChatToolbar } from "@/components/playground/ChatToolbar";
import { SuggestionPanel } from "@/components/playground/SuggestionPanel";
import { PromptInput, type ChatInputModel } from "@/components/ui/ai-chat-input";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { SiteLogo } from "@/components/site/SiteLogo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { useChatRequest } from "@/hooks/use-chat-request";
import { useConversationArchive } from "@/hooks/use-conversation-archive";
import { useSpeech } from "@/hooks/use-speech";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { isNearBottom } from "@/lib/chat-scroll";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getSession, loadSettings } from "@/lib/local-archive";
import { isClientLocalPreviewEnabled } from "@/lib/local-preview";
import { CLODEX_MODELS } from "@/lib/models/clodex-public";
import {
  DEFAULT_ERMA_MODEL_KEY,
  PRIVILEGED_MAX_PROMPT_LENGTH,
  PUBLIC_ERMA_MODELS,
  PUBLIC_MAX_PROMPT_LENGTH,
  type ErmaTier,
} from "@/lib/models/public";
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
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const promptRef = useRef<HTMLDivElement>(null);

  useVisualViewport();

  const localPreview = isClientLocalPreviewEnabled();
  const modelMark = "/images/models/model-mark.png";
  const ermaOptions: ChatInputModel[] = useMemo(
    () => PUBLIC_ERMA_MODELS.map((model) => ({
      id: model.key,
      name: model.name,
      tierLabel: TIER_LABEL[model.tier],
      available: model.available,
      markSrc: modelMark,
    })),
    [],
  );
  const clodexOptions: ChatInputModel[] = useMemo(
    () => CLODEX_MODELS.map((model) => ({
      id: model.key,
      name: model.name,
      tierLabel: "Clodex",
      available: true,
      markSrc: modelMark,
    })),
    [],
  );
  const models = useMemo(
    () => clodexAccess?.active || localPreview ? [...ermaOptions, ...clodexOptions] : ermaOptions,
    [clodexAccess?.active, clodexOptions, ermaOptions, localPreview],
  );
  const promptLimit = clodexAccess?.unlimited || localPreview
    ? PRIVILEGED_MAX_PROMPT_LENGTH
    : PUBLIC_MAX_PROMPT_LENGTH;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedTone === "professional" || savedTone === "character" || savedTone === "erma") setTone(savedTone);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tklabs.erma-tone", tone);
  }, [tone]);

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
        shouldFollowRef.current = true;
        setShowJumpLatest(false);
        return;
      }
    }
    if (modelParam && [...ermaOptions, ...clodexOptions].some((model) => model.id === modelParam)) {
      setModelKey(modelParam);
      return;
    }
    const defaultModel = loadSettings().defaultModel;
    if (defaultModel && ermaOptions.some((model) => model.id === defaultModel)) setModelKey(defaultModel);
    // Search params are the source of truth for session restoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !shouldFollowRef.current) return;
    const frame = requestAnimationFrame(() => node.scrollTo({ top: node.scrollHeight, behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [chat.messages]);

  function handleTranscriptScroll() {
    const node = scrollRef.current;
    if (!node) return;
    const nearBottom = isNearBottom(node.scrollTop, node.clientHeight, node.scrollHeight);
    shouldFollowRef.current = nearBottom;
    setShowJumpLatest(!nearBottom);
  }

  function jumpLatest() {
    const node = scrollRef.current;
    if (!node) return;
    shouldFollowRef.current = true;
    setShowJumpLatest(false);
    node.scrollTo({
      top: node.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  function focusComposer() {
    requestAnimationFrame(() => promptRef.current?.querySelector("textarea")?.focus());
  }

  function startNewDialog() {
    archive.reset();
    chat.clearMessages();
    setInput("");
    setSuggestionKind(null);
    setShowJumpLatest(false);
    shouldFollowRef.current = true;
    speech.stopSpeech();
    router.replace("/playground");
    focusComposer();
  }

  function copyRequestId(message: ChatMessage) {
    if (!message.requestId) return;
    void navigator.clipboard?.writeText(message.requestId);
  }

  return (
    <div className="chat-workspace flex h-full min-h-0 flex-1 overflow-hidden">
      <aside className="chat-desktop-sidebar hidden w-[260px] shrink-0 flex-col border-r border-outline-variant bg-surface/70 p-4 lg:flex" aria-label={text.chat.currentSession}>
        <div className="mb-5 flex items-center gap-2 px-2">
          <Image src={modelMark} alt="" width={28} height={28} className="size-7 object-contain" />
          <span className="label-caps text-on-secondary-container">{text.chat.history}</span>
        </div>
        <ConversationArchive locale={locale} headingId="desktop-chat-history-title" />
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="playground-header hairline-b flex min-h-14 shrink-0 items-center justify-between gap-2 bg-surface/92 px-3 backdrop-blur-md sm:min-h-16 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/" aria-label="TK LAB" className="shrink-0">
              <SiteLogo showWordmark={false} className="origin-left scale-75" />
            </Link>
            <div className="lg:hidden"><HistoryDropdown locale={locale} /></div>
            <div className="min-w-0">
              <p className="label-caps hidden text-on-secondary-container sm:block">TK LAB · AI CHAT</p>
              <div className="flex items-center gap-2">
                <span className={cn("chat-status-dot size-2 rounded-full bg-primary", chat.isPending && "animate-pulse")} />
                <span className="truncate text-[12px] text-on-secondary-container sm:text-[13px]">
                  {chat.isPending ? text.chat.generating : clodexAccess?.active || localPreview ? text.chat.clodexReady : text.chat.ready}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle lightLabel={text.nav.themeLight} darkLabel={text.nav.themeDark} />
            <LanguageToggle locale={locale} label={text.nav.language} />
            <Link href="/profile" className="hidden min-h-10 items-center rounded-full px-3 text-[12px] text-on-secondary-container hover:bg-surface-container-low hover:text-primary sm:inline-flex">
              {text.nav.profile}
            </Link>
            <button
              type="button"
              onClick={startNewDialog}
              disabled={chat.messages.length === 0}
              className="chat-new-button grid size-10 place-items-center rounded-full border border-outline-variant text-on-secondary-container hover:border-primary hover:bg-surface-container-low hover:text-primary disabled:pointer-events-none disabled:opacity-30"
              aria-label={text.chat.newDialog}
            >
              <SquarePen size={15} />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleTranscriptScroll}
            className="playground-transcript absolute inset-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-8 md:px-10"
            role="region"
            aria-label={text.chat.currentSession}
          >
            {chat.messages.length === 0 ? (
              <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center py-8">
                <div className="w-full max-w-2xl px-2 sm:px-6">
                  <div className="mb-5 flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-2.5">
                    <Image src={modelMark} alt="" width={36} height={36} className="size-full object-contain" />
                  </div>
                  <p className="label-caps mb-3 text-on-secondary-container">{text.chat.emptyKicker}</p>
                  <h2 className="mb-3 max-w-2xl font-serif text-[32px] leading-[1.15] text-primary sm:text-[42px]">{text.chat.emptyTitle}</h2>
                  <p className="max-w-xl text-[15px] leading-[1.65] text-on-secondary-container">{text.chat.emptyDescription}</p>
                </div>
              </div>
            ) : (
              <MessageList
                messages={chat.messages}
                isPending={chat.isPending}
                locale={locale}
                text={text}
                copiedMessageId={speech.copiedMessageId}
                speakingMessageId={speech.speechMessageId}
                speechNotice={speech.speechNotice}
                onCopy={(message) => void speech.copyMessage(message)}
                onSpeak={(message) => void speech.speakMessage(message)}
                onRetry={chat.retryMessage}
                onEdit={(message) => {
                  setInput(message.content);
                  focusComposer();
                }}
                onCopyRequestId={copyRequestId}
              />
            )}
          </div>

          {showJumpLatest && (
            <button
              type="button"
              onClick={jumpLatest}
              className="absolute bottom-4 left-1/2 z-20 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 text-[12px] font-medium text-primary shadow-lg"
            >
              <ArrowDown size={14} /> {locale === "ru" ? "К последнему" : "Jump to latest"}
            </button>
          )}
        </div>

        <div className="chat-composer-area hairline-t safe-area-bottom w-full shrink-0 bg-surface/96 px-3 pt-3 backdrop-blur-md sm:px-5 md:px-8">
          <ChatToolbar
            text={text}
            suggestionKind={suggestionKind}
            reasonEnabled={reasonEnabled}
            tone={tone}
            onSuggestion={(kind) => setSuggestionKind((current) => current === kind ? null : kind)}
            onReason={() => setReasonEnabled((enabled) => !enabled)}
            onTone={() => setTone((current) => NEXT_TONE[current])}
          />
          {suggestionKind && (
            <SuggestionPanel
              text={text}
              kind={suggestionKind}
              onClose={() => setSuggestionKind(null)}
              onChoose={(suggestion) => {
                setInput(suggestion);
                setSuggestionKind(null);
                focusComposer();
              }}
            />
          )}
          <PromptInput
            ref={promptRef}
            value={input}
            onChange={setInput}
            onSubmit={chat.handleSubmit}
            models={models}
            selectedModelId={selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY}
            onModelChange={setModelKey}
            busy={chat.isPending}
            onStop={chat.stopGeneration}
            maxLength={promptLimit}
            placeholder={text.chat.promptPlaceholder}
            attachmentsEnabled
            maxAttachmentBytes={clodexAccess?.unlimited ? 64 * 1024 : 16 * 1024}
            maxAttachmentContextLength={clodexAccess?.unlimited ? 32_000 : 8_000}
            labels={text.chat.input}
            voiceLanguage={locale === "ru" ? "ru-RU" : "en-US"}
          />
        </div>
      </section>
    </div>
  );
}
