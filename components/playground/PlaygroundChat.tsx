"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, Square, SquarePen } from "lucide-react";
import Link from "next/link";

import { ConversationArchive } from "@/components/playground/ConversationArchive";
import { HistoryDropdown } from "@/components/playground/HistoryDropdown";
import { MessageList, type ChatMessage } from "@/components/playground/MessageList";
import { ChatToolbar } from "@/components/playground/ChatToolbar";
import { SuggestionPanel } from "@/components/playground/SuggestionPanel";
import { PromptInput, type ChatInputModel } from "@/components/ui/ai-chat-input";
import { useChatRequest } from "@/hooks/use-chat-request";
import { useConversationArchive } from "@/hooks/use-conversation-archive";
import { useSpeech } from "@/hooks/use-speech";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { CLODEX_MODELS } from "@/lib/models/clodex-public";
import { DEFAULT_ERMA_MODEL_KEY, PRIVILEGED_MAX_PROMPT_LENGTH, PUBLIC_ERMA_MODELS, PUBLIC_MAX_PROMPT_LENGTH, type ErmaTier } from "@/lib/models/public";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getSession, loadSettings } from "@/lib/local-archive";
import { isClientLocalPreviewEnabled } from "@/lib/local-preview";
import { isNearBottom } from "@/lib/chat-scroll";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { SiteLogo } from "@/components/site/SiteLogo";
import { ThemeToggle } from "@/components/site/ThemeToggle";

const TIER_LABEL: Record<ErmaTier, string> = { light: "Light", medium: "Medium", heavy: "Heavy" };
type SuggestionKind = "learn" | "write";
type Tone = "professional" | "character" | "erma";

const NEXT_TONE: Record<Tone, Tone> = { professional: "character", character: "erma", erma: "professional" };

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
  const ermaOptions: ChatInputModel[] = useMemo(() => PUBLIC_ERMA_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: TIER_LABEL[model.tier], available: model.available, markSrc: modelMark })), []);
  const clodexOptions: ChatInputModel[] = useMemo(() => CLODEX_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: "Clodex", available: true, markSrc: modelMark })), []);
  const models = useMemo(() => clodexAccess?.active || localPreview ? [...ermaOptions, ...clodexOptions] : ermaOptions, [clodexAccess?.active, clodexOptions, ermaOptions, localPreview]);
  const promptLimit = clodexAccess?.unlimited || localPreview ? PRIVILEGED_MAX_PROMPT_LENGTH : PUBLIC_MAX_PROMPT_LENGTH;
  const selectedModel = models.find((model) => model.id === modelKey) ?? models[0];
  const archive = useConversationArchive();
  const chat = useChatRequest({ locale, tone, reasonEnabled, promptLimit, saveConversation: archive.save });
  const speech = useSpeech(locale, ttsAvailable, { voiceUnsupported: text.chat.voiceUnsupported, speechFailed: text.chat.speechFailed, copyFailed: text.chat.copyFailed });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/access", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as ClodexAccessStatus;
      if (!cancelled) setClodexAccess(payload);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tts", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as { available?: unknown };
      if (!cancelled) setTtsAvailable(payload.available === true);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const savedTone = window.localStorage.getItem("tklabs.erma-tone");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedTone === "professional" || savedTone === "character" || savedTone === "erma") setTone(savedTone);
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
    // The search params are the source of truth for session restoration.
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
    node.scrollTo({ top: node.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function startNewDialog() {
    archive.reset();
    chat.clearMessages();
    setInput("");
    setSuggestionKind(null);
    setShowJumpLatest(false);
    speech.stopSpeech();
    router.replace("/playground");
  }

  function copyRequestId(message: ChatMessage) {
    if (!message.requestId) return;
    void navigator.clipboard?.writeText(message.requestId);
  }

  return (
    <div className="chat-workspace flex min-h-0 flex-1 overflow-hidden" style={{ minHeight: "var(--chat-visual-height, 0px)" }}>
      <aside className="chat-desktop-sidebar hidden w-[260px] shrink-0 border-r border-outline-variant bg-surface/70 p-4 xl:block" aria-label={text.chat.currentSession}>
        <div className="mb-5 flex items-center gap-2 px-2"><Image src="/images/models/model-mark.png" alt="" width={28} height={28} className="size-7 object-contain" /><span className="label-caps text-on-secondary-container">{text.chat.currentSession}</span></div>
        <ConversationArchive locale={locale} headingId="desktop-chat-history-title" />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="playground-header hairline-b flex min-h-16 shrink-0 items-center justify-between gap-3 bg-surface/85 px-4 backdrop-blur-md sm:min-h-20 sm:px-margin-mobile md:px-margin-desktop">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="md:hidden" aria-label="TK LAB"><SiteLogo showWordmark={false} className="scale-75 origin-left" /></Link>
            <div className="xl:hidden"><HistoryDropdown locale={locale} /></div>
            <div className="min-w-0"><p className="label-caps hidden text-on-secondary-container sm:block">TK LAB · AI CHAT</p><div className="flex items-center gap-2"><span className={cn("chat-status-dot size-2.5 rounded-full bg-primary", chat.isPending && "scale-150 animate-pulse")} /><span className="min-w-0 truncate text-[13px] leading-[1.4] text-on-secondary-container">{chat.isPending ? text.chat.generating : clodexAccess?.active || localPreview ? text.chat.clodexReady : text.chat.ready}</span></div></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 md:hidden"><ThemeToggle lightLabel={text.nav.themeLight} darkLabel={text.nav.themeDark} /><LanguageToggle locale={locale} label={text.nav.language} /></div>
            {chat.isPending && <button type="button" onClick={chat.stopGeneration} aria-label={text.chat.generationStopped} className="chat-control-button label-caps flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-error/50 px-3 text-error transition-colors hover:border-error hover:bg-error/10"><Square size={12} /><span className="hidden sm:inline">{text.chat.generationStopped}</span></button>}
            <button type="button" onClick={startNewDialog} disabled={chat.messages.length === 0 || chat.isPending} className="chat-new-button label-caps flex min-h-11 items-center gap-2 rounded-full border border-outline-variant px-3 text-on-secondary-container transition-[background-color,color,transform] duration-200 hover:-translate-y-px hover:border-primary hover:bg-surface-container-low hover:text-primary disabled:pointer-events-none disabled:opacity-30"><SquarePen size={14} /><span className="hidden sm:inline">{text.chat.newDialog}</span></button>
          </div>
        </header>

        <div ref={scrollRef} onScroll={handleTranscriptScroll} className="playground-transcript relative min-h-0 flex-grow overflow-y-auto overscroll-contain px-4 py-6 sm:px-margin-mobile sm:py-10 md:px-margin-desktop" role="region" aria-label={text.chat.currentSession}>
          {chat.messages.length === 0 ? (
            <div className="chat-empty-enter mx-auto flex h-full min-h-[260px] w-full max-w-3xl items-center justify-center pb-8"><div className="chat-empty-card w-full rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_24px_80px_color-mix(in_srgb,var(--color-primary)_7%,transparent)] sm:p-10"><div className="mb-7 flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-2.5"><Image src={modelMark} alt="" width={42} height={42} className="size-full object-contain" /></div><p className="label-caps mb-4 text-on-secondary-container">{text.chat.emptyKicker}</p><h2 className="mb-3 max-w-2xl font-serif text-[36px] leading-[1.12] text-primary md:text-[48px]">{text.chat.emptyTitle}</h2><p className="max-w-xl text-[16px] leading-[1.65] text-on-secondary-container">{text.chat.emptyDescription}</p></div></div>
          ) : <MessageList messages={chat.messages} isPending={chat.isPending} locale={locale} text={text} copiedMessageId={speech.copiedMessageId} speakingMessageId={speech.speechMessageId} speechNotice={speech.speechNotice} onCopy={(message) => void speech.copyMessage(message)} onSpeak={(message) => void speech.speakMessage(message)} onRetry={chat.retryMessage} onEdit={(message) => { setInput(message.content); promptRef.current?.querySelector("textarea")?.focus(); }} onCopyRequestId={copyRequestId} />}
          {showJumpLatest && <button type="button" onClick={jumpLatest} className="sticky bottom-4 left-1/2 z-20 mx-auto flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 text-[12px] font-medium text-primary shadow-lg"><ArrowDown size={14} /> {locale === "ru" ? "К последнему" : "Jump to latest"}</button>}
        </div>

        <div className="chat-composer-area hairline-t safe-area-bottom w-full shrink-0 bg-surface/92 px-4 pt-4 backdrop-blur-md sm:px-margin-mobile md:px-margin-desktop"><ChatToolbar text={text} suggestionKind={suggestionKind} reasonEnabled={reasonEnabled} tone={tone} onSuggestion={(kind) => setSuggestionKind((current) => current === kind ? null : kind)} onReason={() => setReasonEnabled((enabled) => !enabled)} onTone={() => setTone((current) => NEXT_TONE[current])} />{suggestionKind && <SuggestionPanel text={text} kind={suggestionKind} onClose={() => setSuggestionKind(null)} onChoose={(suggestion) => { setInput(suggestion); setSuggestionKind(null); }} />}<PromptInput ref={promptRef} value={input} onChange={setInput} onSubmit={chat.handleSubmit} models={models} selectedModelId={selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY} onModelChange={setModelKey} busy={chat.isPending} onStop={chat.stopGeneration} maxLength={promptLimit} placeholder={text.chat.promptPlaceholder} attachmentsEnabled maxAttachmentBytes={clodexAccess?.unlimited ? 64 * 1024 : 16 * 1024} maxAttachmentContextLength={clodexAccess?.unlimited ? 32_000 : 8_000} labels={text.chat.input} voiceLanguage={locale === "ru" ? "ru-RU" : "en-US"} /></div>
      </section>
    </div>
  );
}
