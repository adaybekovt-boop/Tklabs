"use client";

/* eslint-disable react-hooks/set-state-in-effect -- search params, saved settings, and per-chat drafts hydrate client state. */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, FolderKanban, GitBranch, Menu, PanelRightOpen, SquarePen, X } from "lucide-react";

import { ChatContextDrawer } from "@/components/playground/ChatContextDrawer";
import { ConversationArchive } from "@/components/playground/ConversationArchive";
import { MobileChatDrawer } from "@/components/playground/MobileChatDrawer";
import { ResponsiveChatComposer } from "@/components/playground/ResponsiveChatComposer";
import { ResponsiveMessageList, type ResponsiveMessageListProps } from "@/components/playground/ResponsiveMessageList";
import type { ChatMessage } from "@/components/playground/MessageList";
import type { ChatInputAttachment, ChatInputModel, ChatInputSubmitMeta } from "@/components/ui/ai-chat-input";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { SiteLogo } from "@/components/site/SiteLogo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { useChatRequest } from "@/hooks/use-chat-request";
import { useConversationArchive } from "@/hooks/use-conversation-archive";
import { useSpeech } from "@/hooks/use-speech";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { readChatDraft, writeChatDraft } from "@/lib/chat-draft";
import { type ChatResponseMode } from "@/lib/chat-modes";
import { isNearBottom } from "@/lib/chat-scroll";
import { getDictionary, type Locale } from "@/lib/i18n";
import { branchSession, getSession, loadSettings, setSessionProject } from "@/lib/local-archive";
import { isClientLocalPreviewEnabled } from "@/lib/local-preview";
import { CLODEX_MODELS } from "@/lib/models/clodex-public";
import {
  AUTO_ERMA_MODEL_KEY,
  DEFAULT_ERMA_MODEL_KEY,
  PRIVILEGED_MAX_PROMPT_LENGTH,
  PUBLIC_ERMA_AUTO_MODEL,
  PUBLIC_ERMA_MODELS,
  PUBLIC_MAX_PROMPT_LENGTH,
  type ErmaTier,
} from "@/lib/models/public";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<ErmaTier, string> = { light: "Fast", medium: "Balanced", heavy: "Deep" };
type DrawerTab = "activity" | "context" | "settings";
type PromptEditBranchState = {
  sourceSessionId: string;
  sourceTitle: string;
  submitted: boolean;
};

export function PlaygroundChat({
  locale,
  onOpenArtifacts,
  onOpenRuns,
}: {
  locale: Locale;
  onOpenArtifacts?: () => void;
  onOpenRuns?: () => void;
}) {
  const text = getDictionary(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [modelKey, setModelKey] = useState(DEFAULT_ERMA_MODEL_KEY);
  const [clodexAccess, setClodexAccess] = useState<ClodexAccessStatus | null>(null);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [responseMode, setResponseMode] = useState<ChatResponseMode>("normal");
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("context");
  const [compareModel, setCompareModel] = useState("");
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);
  const [composerAttachments, setComposerAttachments] = useState<ChatInputAttachment[]>([]);
  const [currentProject, setCurrentProject] = useState("");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [promptEditBranch, setPromptEditBranch] = useState<PromptEditBranchState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const promptRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useVisualViewport();

  const localPreview = isClientLocalPreviewEnabled();
  const modelMark = "/images/models/model-mark.png";
  const ermaOptions: ChatInputModel[] = useMemo(() => [
    { id: PUBLIC_ERMA_AUTO_MODEL.key, name: PUBLIC_ERMA_AUTO_MODEL.name, tierLabel: locale === "ru" ? "Рекомендуется" : "Recommended", available: true, markSrc: modelMark },
    ...PUBLIC_ERMA_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: TIER_LABEL[model.tier], available: model.available, markSrc: modelMark })),
  ], [locale]);
  const clodexOptions: ChatInputModel[] = useMemo(
    () => CLODEX_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: "Clodex", available: true, markSrc: modelMark })),
    [],
  );
  const models = useMemo(() => clodexAccess?.active || localPreview ? [...ermaOptions, ...clodexOptions] : ermaOptions, [clodexAccess?.active, clodexOptions, ermaOptions, localPreview]);
  const promptLimit = clodexAccess?.unlimited || localPreview ? PRIVILEGED_MAX_PROMPT_LENGTH : PUBLIC_MAX_PROMPT_LENGTH;
  const selectedModel = models.find((model) => model.id === modelKey) ?? models[0];
  const fallbackCompareModel = models.find((model) => model.available && model.id !== selectedModel?.id && model.id !== AUTO_ERMA_MODEL_KEY)?.id
    ?? models.find((model) => model.available && model.id !== selectedModel?.id)?.id
    ?? selectedModel?.id
    ?? "";
  const effectiveCompareModel = compareModel
    && compareModel !== selectedModel?.id
    && models.some((model) => model.id === compareModel && model.available)
    ? compareModel
    : fallbackCompareModel;
  const archive = useConversationArchive();
  const chat = useChatRequest({
    locale,
    tone: "professional",
    reasonEnabled,
    responseMode,
    promptLimit,
    currentModel: selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY,
    saveConversation: archive.save,
  });
  const speech = useSpeech(locale, ttsAvailable, {
    voiceUnsupported: text.chat.voiceUnsupported,
    speechFailed: text.chat.speechFailed,
    copyFailed: text.chat.copyFailed,
  });
  const contextRatio = chat.contextStats.estimatedTokens / Math.max(1, chat.contextStats.limit);
  const contextWarning = contextRatio >= 0.8;
  const conversationTitle = currentProject || (locale === "ru" ? "Новый диалог" : "New conversation");
  const statusLabel = chat.requestStatus === "connecting"
    ? locale === "ru" ? "Подключаюсь" : "Connecting"
    : chat.requestStatus === "analyzing"
      ? locale === "ru" ? "Проверяю контекст" : "Checking context"
      : chat.requestStatus === "generating"
        ? locale === "ru" ? "Формирую ответ" : "Writing answer"
        : selectedModel?.name ?? "Erma";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/access", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) return; const payload = (await response.json()) as ClodexAccessStatus; if (!cancelled) setClodexAccess(payload); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tts", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) return; const payload = (await response.json()) as { available?: unknown }; if (!cancelled) setTtsAvailable(payload.available === true); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem("tklabs.response-mode");
      if (savedMode === "normal" || savedMode === "analysis" || savedMode === "code" || savedMode === "search" || savedMode === "document") setResponseMode(savedMode);
    } catch {
      // The chat remains usable when browser storage is unavailable.
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("tklabs.response-mode", responseMode);
    } catch {
      // Response mode remains available for the active tab.
    }
  }, [responseMode]);

  useEffect(() => {
    const sessionParam = searchParams.get("session");
    const modelParam = searchParams.get("model");
    if (sessionParam) {
      const saved = getSession(sessionParam);
      if (saved) {
        archive.setSessionId(saved.id);
        setModelKey(saved.model);
        setCurrentProject(saved.project ?? "");
        chat.setMessages(saved.messages);
        shouldFollowRef.current = true;
        setShowJumpLatest(false);
        return;
      }
    }
    setCurrentProject("");
    if (modelParam && [...ermaOptions, ...clodexOptions].some((model) => model.id === modelParam)) { setModelKey(modelParam); return; }
    const defaultModel = loadSettings().defaultModel;
    if (defaultModel && ermaOptions.some((model) => model.id === defaultModel)) setModelKey(defaultModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useLayoutEffect(() => {
    // Restore the per-session draft before the browser can accept user input.
    // A passive effect can race the first keystroke after hydration and erase it.
    setInput(readChatDraft(archive.sessionId));
  }, [archive.sessionId]);
  useEffect(() => {
    const timer = window.setTimeout(() => writeChatDraft(archive.sessionId, input), 180);
    return () => window.clearTimeout(timer);
  }, [archive.sessionId, input]);

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

  function focusComposer() {
    requestAnimationFrame(() => promptRef.current?.querySelector("textarea")?.focus());
  }

  function startNewDialog() {
    archive.reset();
    chat.clearMessages();
    setInput("");
    setCurrentProject("");
    setShowJumpLatest(false);
    setDrawerOpen(false);
    setMobileHistoryOpen(false);
    setPromptEditBranch(null);
    shouldFollowRef.current = true;
    speech.stopSpeech();
    router.replace("/playground");
    focusComposer();
  }

  function openWorkspace(message?: ChatMessage, tab: DrawerTab = "context") {
    if (message?.role === "assistant") setCompareTargetId(message.id);
    setDrawerTab(tab);
    setDrawerOpen(true);
  }

  function closeWorkspace() {
    setDrawerOpen(false);
    setCompareTargetId(null);
  }

  function handleAttachmentsChange(attachments: ChatInputAttachment[]) {
    const addedFile = attachments.length > composerAttachments.length;
    setComposerAttachments(attachments);
    if (addedFile && window.innerWidth >= 1280) openWorkspace(undefined, "context");
  }

  function branchFromMessage(message: ChatMessage) {
    if (chat.isPending) return;
    const firstPrompt = chat.messages.find((entry) => entry.role === "user")?.content ?? "Conversation";
    archive.save(firstPrompt, selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY, chat.messages);
    const title = getSession(archive.sessionId)?.title ?? firstPrompt.slice(0, 48);
    const branch = branchSession(archive.sessionId, message.id, `${title} · ${locale === "ru" ? "ветка" : "branch"}`);
    if (!branch) return;
    archive.setSessionId(branch.id);
    chat.setMessages(branch.messages);
    setCurrentProject(branch.project ?? "");
    setPromptEditBranch(null);
    router.push(`/playground?session=${encodeURIComponent(branch.id)}`);
    shouldFollowRef.current = true;
  }

  function editPromptInBranch(message: ChatMessage) {
    if (chat.isPending || message.role !== "user") return;
    const messageIndex = chat.messages.findIndex((entry) => entry.id === message.id);
    if (messageIndex < 0) return;

    const sourceSessionId = archive.sessionIdRef.current;
    const firstPrompt = chat.messages.find((entry) => entry.role === "user")?.content ?? "Conversation";
    archive.save(firstPrompt, selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY, chat.messages);
    const source = getSession(sourceSessionId);
    const sourceTitle = source?.title ?? firstPrompt.slice(0, 56);
    const previousMessage = messageIndex > 0 ? chat.messages[messageIndex - 1] : null;
    let branchId: string;

    if (previousMessage) {
      const branch = branchSession(
        sourceSessionId,
        previousMessage.id,
        `${sourceTitle} · ${locale === "ru" ? "редактирование" : "edited branch"}`,
      );
      if (!branch) return;
      branchId = branch.id;
      archive.setSessionId(branch.id);
      chat.setMessages(branch.messages);
      setCurrentProject(branch.project ?? "");
      router.push(`/playground?session=${encodeURIComponent(branch.id)}`);
    } else {
      branchId = archive.reset();
      chat.clearMessages();
      setCurrentProject("");
      router.push("/playground");
    }

    setComposerAttachments([]);
    setInput(message.content);
    writeChatDraft(branchId, message.content);
    setPromptEditBranch({ sourceSessionId, sourceTitle, submitted: false });
    setShowJumpLatest(false);
    shouldFollowRef.current = true;
    speech.stopSpeech();
    focusComposer();
  }

  function returnToOriginalConversation() {
    if (!promptEditBranch || chat.isPending) return;
    const source = getSession(promptEditBranch.sourceSessionId);
    if (!source) {
      setPromptEditBranch(null);
      return;
    }
    archive.setSessionId(source.id);
    setModelKey(source.model);
    setCurrentProject(source.project ?? "");
    chat.setMessages(source.messages);
    setComposerAttachments([]);
    setInput(readChatDraft(source.id));
    setPromptEditBranch(null);
    setShowJumpLatest(false);
    shouldFollowRef.current = true;
    router.push(`/playground?session=${encodeURIComponent(source.id)}`);
  }

  function handlePromptSubmit(prompt: string, submitMeta: ChatInputSubmitMeta) {
    const accepted = chat.handleSubmit(prompt, submitMeta);
    if (accepted) setPromptEditBranch((current) => current ? { ...current, submitted: true } : current);
    return accepted;
  }

  function compareSelectedAnswer() {
    const target = compareTargetId
      ? chat.messages.find((message) => message.id === compareTargetId)
      : [...chat.messages].reverse().find((message) => message.role === "assistant" && message.content && !message.error);
    if (!target || !effectiveCompareModel) return;
    void chat.compareMessage(target.id, effectiveCompareModel);
  }

  function updateProject(project: string) {
    setCurrentProject(project.trim());
    setSessionProject(archive.sessionId, project);
  }

  const messageListProps: ResponsiveMessageListProps = {
    messages: chat.messages,
    isPending: chat.isPending,
    locale,
    text,
    copiedMessageId: speech.copiedMessageId,
    speakingMessageId: speech.speechMessageId,
    speechNotice: speech.speechNotice,
    onCopy: (message) => void speech.copyMessage(message),
    onSpeak: (message) => void speech.speakMessage(message),
    onRetry: chat.retryMessage,
    onRegenerate: chat.regenerateMessage,
    onRestorePrevious: (message) => chat.restorePreviousVersion(message.id),
    onEdit: editPromptInBranch,
    onBranch: branchFromMessage,
    onOpenWorkspace: (message) => openWorkspace(message, "settings"),
    onToggleContext: (message) => chat.toggleMessageContext(message.id),
  };

  return (
    <div className="chat-workspace flex h-full min-h-0 flex-1 overflow-hidden" data-calm-chat-workspace>
      <aside className="chat-desktop-sidebar hidden w-[268px] shrink-0 flex-col border-r border-outline-variant bg-surface/70 p-4 lg:flex" aria-label={text.chat.history}>
        <div className="mb-3 flex items-center gap-2 px-2"><Image src={modelMark} alt="" width={28} height={28} className="size-7 object-contain" /><div><span className="label-caps block text-on-secondary-container">{text.chat.history}</span><span className="mt-1 block text-[11px] text-on-secondary-container">{locale === "ru" ? "Диалоги и проекты" : "Conversations and projects"}</span></div></div>
        <ConversationArchive locale={locale} headingId="desktop-chat-history-title" compact />
      </aside>

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        onTouchStart={(event) => { const touch = event.touches[0]; swipeStartRef.current = touch && touch.clientX <= 28 ? { x: touch.clientX, y: touch.clientY } : null; }}
        onTouchEnd={(event) => { const start = swipeStartRef.current; const touch = event.changedTouches[0]; swipeStartRef.current = null; if (!start || !touch || window.innerWidth >= 768) return; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (deltaX > 72 && Math.abs(deltaY) < 60) setMobileHistoryOpen(true); }}
      >
        <header className="playground-header shrink-0 border-b border-outline-variant bg-surface/94 backdrop-blur-md">
          <div className="flex min-h-14 items-center justify-between gap-2 px-3 md:hidden">
            <button type="button" onClick={() => setMobileHistoryOpen(true)} className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-surface-container-low" aria-label={text.chat.history} aria-expanded={mobileHistoryOpen}><Menu size={19} /></button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[13px] font-semibold text-primary">{conversationTitle}</p>
              <div className="mt-0.5 flex min-w-0 items-center justify-center gap-2"><span className={cn("chat-status-dot size-1.5 shrink-0 rounded-full bg-primary", chat.isPending && "animate-pulse")} /><span className="truncate text-[11px] text-on-secondary-container">{statusLabel}</span></div>
            </div>
            <button type="button" onClick={startNewDialog} disabled={chat.messages.length === 0} className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-30" aria-label={text.chat.newDialog}><SquarePen size={18} /></button>
          </div>

          <div className="hidden min-h-16 items-center justify-between gap-3 px-5 md:flex">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" aria-label="TK LAB" className="shrink-0"><SiteLogo showWordmark={false} className="origin-left scale-75" /></Link>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-primary">{conversationTitle}</p>
                <div className="flex min-w-0 items-center gap-2"><span className={cn("chat-status-dot size-2 shrink-0 rounded-full bg-primary", chat.isPending && "animate-pulse")} /><span className="truncate text-[12px] text-on-secondary-container">{statusLabel}</span>{currentProject && <span className="hidden min-w-0 items-center gap-1 truncate rounded-full bg-surface-container-low px-2 py-1 text-[10px] text-on-secondary-container lg:flex"><FolderKanban size={11} /><span className="truncate">{currentProject}</span></span>}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle lightLabel={text.nav.themeLight} darkLabel={text.nav.themeDark} />
              <LanguageToggle locale={locale} label={text.nav.language} />
              <button type="button" onClick={() => openWorkspace(undefined, "activity")} className={cn("hidden size-10 place-items-center rounded-full border border-outline-variant text-on-secondary-container hover:border-primary hover:bg-surface-container-low hover:text-primary xl:grid", drawerOpen && "border-primary bg-surface-container-low text-primary")} aria-label={locale === "ru" ? "Открыть рабочую область" : "Open workspace"} aria-pressed={drawerOpen}><PanelRightOpen size={15} /></button>
              <button type="button" onClick={startNewDialog} disabled={chat.messages.length === 0} className="grid size-10 place-items-center rounded-full border border-outline-variant text-on-secondary-container hover:border-primary hover:bg-surface-container-low hover:text-primary disabled:pointer-events-none disabled:opacity-30" aria-label={text.chat.newDialog}><SquarePen size={15} /></button>
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <div ref={scrollRef} onScroll={handleTranscriptScroll} className="playground-transcript absolute inset-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-8 md:px-10" role="region" aria-label={text.chat.currentSession}>
            {chat.messages.length === 0 ? (
              <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center py-8">
                <div className="flex flex-col items-center text-center w-full max-w-2xl px-1 sm:px-6">
                  <h2 className="flex flex-wrap items-center justify-center gap-3 font-serif text-[31px] leading-[1.12] text-primary sm:text-[36px] md:text-[48px]">
                    {/* {text.chat.emptyTitle} */}
                    <span>{locale === "ru" ? "С чего" : "Where should we"}</span>
                    <span className="inline-flex size-11 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-2 align-middle sm:size-14 sm:p-2.5">
                      <Image src={modelMark} alt="" width={36} height={36} className="size-full object-contain" />
                    </span>
                    <span>{locale === "ru" ? "начнём?" : "begin?"}</span>
                  </h2>
                </div>
              </div>
            ) : <ResponsiveMessageList {...messageListProps} />}
          </div>
          {showJumpLatest && <button type="button" onClick={jumpLatest} className="absolute bottom-3 left-1/2 z-20 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 text-[12px] font-medium text-primary shadow-lg sm:bottom-4"><ArrowDown size={14} />{locale === "ru" ? "К последнему" : "Jump to latest"}</button>}
        </div>

        <div className="chat-composer-area safe-area-bottom w-full shrink-0 border-t border-outline-variant bg-surface/96 px-3 pb-2 pt-2 backdrop-blur-md sm:px-5 sm:pb-3 sm:pt-3 md:px-8">
          {promptEditBranch && (
            <div data-branch-preserving-edit className="mx-auto mb-2 flex w-full max-w-[780px] items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-primary shadow-sm">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-on-primary"><GitBranch size={15} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">{locale === "ru" ? (promptEditBranch.submitted ? "Изменённая ветка создана" : "Безопасное редактирование запроса") : (promptEditBranch.submitted ? "Edited branch created" : "Safe prompt editing")}</p>
                <p className="mt-0.5 truncate text-[10px] text-on-secondary-container">{locale === "ru" ? "Исходный диалог сохранён" : "Original conversation preserved"}: {promptEditBranch.sourceTitle}</p>
              </div>
              <button type="button" onClick={returnToOriginalConversation} disabled={chat.isPending} className="min-h-9 shrink-0 rounded-full border border-primary/30 px-3 text-[10px] font-medium hover:bg-primary/10 disabled:opacity-40">{locale === "ru" ? (promptEditBranch.submitted ? "Открыть исходный" : "Отменить") : (promptEditBranch.submitted ? "Open original" : "Cancel")}</button>
              <button type="button" onClick={() => setPromptEditBranch(null)} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-primary/10" aria-label={text.chat.close}><X size={14} /></button>
            </div>
          )}
          {contextWarning && <button type="button" onClick={() => openWorkspace(undefined, "context")} className="mx-auto mb-2 flex w-full max-w-[780px] items-center justify-center rounded-xl px-2 py-1 text-[10px] text-error hover:bg-error-container sm:text-[11px]">{locale === "ru" ? "Контекст близок к лимиту — открыть управление" : "Context is close to the limit — review"}</button>}
          <ResponsiveChatComposer
            ref={promptRef}
            value={input}
            onChange={setInput}
            onSubmit={handlePromptSubmit}
            models={models}
            selectedModelId={selectedModel?.id ?? DEFAULT_ERMA_MODEL_KEY}
            onModelChange={setModelKey}
            responseMode={responseMode}
            onResponseModeChange={setResponseMode}
            reasonEnabled={reasonEnabled}
            onReasonEnabledChange={setReasonEnabled}
            onAttachmentsChange={handleAttachmentsChange}
            onOpenWorkspace={() => openWorkspace(undefined, "context")}
            busy={chat.isPending}
            onStop={chat.stopGeneration}
            maxLength={promptLimit}
            placeholder={text.chat.promptPlaceholder}
            attachmentsEnabled
            maxAttachmentBytes={clodexAccess?.unlimited ? 64 * 1024 : 16 * 1024}
            maxAttachmentContextLength={clodexAccess?.unlimited ? 31_500 : 7_500}
            labels={text.chat.input}
            voiceLanguage={locale === "ru" ? "ru-RU" : "en-US"}
          />
        </div>
      </section>

      <ChatContextDrawer
        key={drawerTab}
        open={drawerOpen}
        initialTab={drawerTab}
        locale={locale}
        messages={chat.messages}
        contextStats={chat.contextStats}
        attachments={composerAttachments}
        models={models}
        compareModel={effectiveCompareModel}
        responseMode={responseMode}
        reasonEnabled={reasonEnabled}
        project={currentProject}
        onClose={() => closeWorkspace()}
        onCompareModelChange={setCompareModel}
        onCompareLast={compareSelectedAnswer}
        onResponseModeChange={setResponseMode}
        onReasonEnabledChange={setReasonEnabled}
        onProjectChange={updateProject}
      />

      <MobileChatDrawer
        open={mobileHistoryOpen}
        onClose={() => setMobileHistoryOpen(false)}
        locale={locale}
        onNewDialog={startNewDialog}
      />
    </div>
  );
}
