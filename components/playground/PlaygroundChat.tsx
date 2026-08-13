"use client";

/* eslint-disable react-hooks/set-state-in-effect -- search params and per-chat drafts hydrate client state. */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, FolderKanban, Gift, GitBranch, Menu, PanelRightOpen, SquarePen, X } from "lucide-react";

import { ChatContextDrawer } from "@/components/playground/ChatContextDrawer";
import { ConversationArchive } from "@/components/playground/ConversationArchive";
import { MobileChatDrawer } from "@/components/playground/MobileChatDrawer";
import { ResponsiveChatComposer } from "@/components/playground/ResponsiveChatComposer";
import { ResponsiveMessageList, type ResponsiveMessageListProps } from "@/components/playground/ResponsiveMessageList";
import { RewardedAdGate } from "@/components/playground/RewardedAdGate";
import type { ChatMessage } from "@/components/playground/MessageList";
import type { ChatInputAttachment, ChatInputModel, ChatInputSubmitMeta } from "@/components/ui/ai-chat-input";
import { SiteLogo } from "@/components/site/SiteLogo";
import { useChatRequest } from "@/hooks/use-chat-request";
import { useConversationArchive } from "@/hooks/use-conversation-archive";
import { useSpeech } from "@/hooks/use-speech";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { readChatDraft, writeChatDraft } from "@/lib/chat-draft";
import { isNearBottom } from "@/lib/chat-scroll";
import { getChatDictionary } from "@/lib/chat-i18n";
import type { Locale } from "@/lib/i18n";
import { branchSession, getSession, setSessionProject } from "@/lib/local-archive";
import { isClientLocalPreviewEnabled } from "@/lib/local-preview";
import { CLODEX_MODELS } from "@/lib/models/clodex-public";
import { DEFAULT_ERMA_MODEL_KEY, PRIVILEGED_MAX_PROMPT_LENGTH, PUBLIC_ERMA_AUTO_MODEL, PUBLIC_ERMA_MODELS, PUBLIC_MAX_PROMPT_LENGTH } from "@/lib/models/public";
import { cn } from "@/lib/utils";

type ProfileAccess = ClodexAccessStatus & { isAdmin?: boolean; clodexEnabled?: boolean };

type DrawerTab = "activity" | "context";
type PromptEditBranchState = {
  sourceSessionId: string;
  sourceTitle: string;
  submitted: boolean;
};

function latestRewardQuotaError(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "assistant") continue;
    return message.errorCode === "demo_quota_exhausted" && message.rewardAdsAvailable === true
      ? message
      : null;
  }
  return null;
}

export function PlaygroundChat({
  locale,
  onOpenArtifacts,
  onOpenRuns,
}: {
  locale: Locale;
  onOpenArtifacts?: () => void;
  onOpenRuns?: () => void;
}) {
  const text = getChatDictionary(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");
  const [input, setInput] = useState("");
  const [access, setAccess] = useState<ProfileAccess | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_ERMA_MODEL_KEY);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("context");
  const [composerAttachments, setComposerAttachments] = useState<ChatInputAttachment[]>([]);
  const [currentProject, setCurrentProject] = useState("");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [promptEditBranch, setPromptEditBranch] = useState<PromptEditBranchState | null>(null);
  const [rewardGateOpen, setRewardGateOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState(false);
  const [draftLoadedSessionId, setDraftLoadedSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const promptRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const autoOpenedRewardMessageIdRef = useRef<string | null>(null);
  const restoredSessionParamRef = useRef<string | null | undefined>(undefined);

  useVisualViewport();

  const modelMark = "/images/models/model-mark.png";
  const promptLimit = access?.unlimited || localPreview ? PRIVILEGED_MAX_PROMPT_LENGTH : PUBLIC_MAX_PROMPT_LENGTH;
  const showPremiumModels = Boolean(access?.isAdmin && access?.clodexEnabled);
  const chatModels = useMemo<ChatInputModel[]>(() => {
    const base = [PUBLIC_ERMA_AUTO_MODEL, ...PUBLIC_ERMA_MODELS].map((model) => ({
      id: model.key,
      name: model.name,
      tierLabel: "",
      available: model.available,
    }));
    if (!showPremiumModels) return base;
    return [...base, ...CLODEX_MODELS.map((model) => ({ id: model.key, name: model.name, tierLabel: "", available: true }))];
  }, [showPremiumModels]);

  useEffect(() => {
    if (!chatModels.some((model) => model.id === selectedModelId)) setSelectedModelId(DEFAULT_ERMA_MODEL_KEY);
  }, [chatModels, selectedModelId]);

  const archive = useConversationArchive();
  const chat = useChatRequest({
    locale,
    tone: "professional",
    reasonEnabled: false,
    responseMode: "normal",
    promptLimit,
    currentModel: selectedModelId,
    saveConversation: archive.save,
  });
  const speech = useSpeech(locale, ttsAvailable, {
    voiceUnsupported: text.chat.voiceUnsupported,
    speechFailed: text.chat.speechFailed,
    copyFailed: text.chat.copyFailed,
  });
  const contextRatio = chat.contextStats.estimatedTokens / Math.max(1, chat.contextStats.limit);
  const contextWarning = contextRatio >= 0.8;
  const rewardQuotaError = latestRewardQuotaError(chat.messages);
  const conversationTitle = currentProject || (locale === "ru" ? "Новый диалог" : "New conversation");
  const statusLabel = chat.requestStatus === "connecting"
    ? locale === "ru" ? "Начинаю" : "Starting"
    : chat.requestStatus === "analyzing"
      ? locale === "ru" ? "Понимаю задачу" : "Understanding the task"
      : chat.requestStatus === "generating"
        ? locale === "ru" ? "Готовлю ответ" : "Preparing answer"
        : "Erma";
  const liveStatusLabel = chat.requestStatus === "completed"
    ? locale === "ru" ? "Ответ готов" : "Answer ready"
    : chat.requestStatus === "error"
      ? locale === "ru" ? "Ошибка ответа" : "Response error"
      : chat.requestStatus === "stopped"
        ? locale === "ru" ? "Ответ остановлен" : "Response stopped"
        : chat.isPending
          ? statusLabel
          : "";

  useEffect(() => {
    setLocalPreview(isClientLocalPreviewEnabled());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/access", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as ProfileAccess;
        if (!cancelled) setAccess(payload);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!rewardQuotaError || autoOpenedRewardMessageIdRef.current === rewardQuotaError.id) return;
    autoOpenedRewardMessageIdRef.current = rewardQuotaError.id;
    setRewardGateOpen(true);
  }, [rewardQuotaError]);

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
    if (restoredSessionParamRef.current === sessionParam) return;
    const previousSessionParam = restoredSessionParamRef.current;
    restoredSessionParamRef.current = sessionParam;
    if (previousSessionParam === undefined && sessionParam === null) return;
    restoreArchivedSession(sessionParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParam]);

  useLayoutEffect(() => {
    setInput(readChatDraft(archive.sessionId));
    setDraftLoadedSessionId(archive.sessionId);
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
    setRewardGateOpen(false);
    shouldFollowRef.current = true;
    speech.stopSpeech();
    router.replace("/playground");
    focusComposer();
  }

  function restoreArchivedSession(sessionId: string | null) {
    if (sessionId) {
      const saved = getSession(sessionId);
      if (saved) {
        archive.setSessionId(saved.id);
        chat.replaceMessages(saved.messages);
        setCurrentProject(saved.project ?? "");
        shouldFollowRef.current = true;
        setShowJumpLatest(false);
        return;
      }
    }
    archive.reset();
    chat.replaceMessages([]);
    setCurrentProject("");
    setShowJumpLatest(false);
  }

  function openWorkspace(_message?: ChatMessage, tab: DrawerTab = "context") {
    setDrawerTab(tab);
    setDrawerOpen(true);
  }

  function handleAttachmentsChange(attachments: ChatInputAttachment[]) {
    const addedFile = attachments.length > composerAttachments.length;
    setComposerAttachments(attachments);
    if (addedFile && window.innerWidth >= 1280) openWorkspace(undefined, "context");
  }

  function branchFromMessage(message: ChatMessage) {
    if (chat.isPending) return;
    const firstPrompt = chat.messages.find((entry) => entry.role === "user")?.content ?? "Conversation";
    archive.save(firstPrompt, DEFAULT_ERMA_MODEL_KEY, chat.messages);
    const title = getSession(archive.sessionId)?.title ?? firstPrompt.slice(0, 48);
    const branch = branchSession(archive.sessionId, message.id, `${title} · ${locale === "ru" ? "ветка" : "branch"}`);
    if (!branch) return;
    archive.setSessionId(branch.id);
    chat.replaceMessages(branch.messages);
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
    archive.save(firstPrompt, DEFAULT_ERMA_MODEL_KEY, chat.messages);
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
      chat.replaceMessages(branch.messages);
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
    setCurrentProject(source.project ?? "");
    chat.replaceMessages(source.messages);
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

  function useRewardRequest() {
    if (!rewardQuotaError || chat.isPending) return;
    setRewardGateOpen(false);
    chat.retryMessage(rewardQuotaError);
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
    onOpenWorkspace: (message) => openWorkspace(message, "context"),
    onToggleContext: (message) => chat.toggleMessageContext(message.id),
  };

  return (
    <div className="chat-workspace flex h-full min-h-0 flex-1 overflow-hidden" data-calm-chat-workspace data-chat-hydrated={draftLoadedSessionId === archive.sessionId ? "true" : undefined}>
      <aside className="chat-desktop-sidebar hidden w-[232px] shrink-0 flex-col border-r border-outline-variant bg-surface/70 p-3 md:flex lg:w-[268px] lg:p-4" aria-label={text.chat.history}>
        <div className="mb-3 flex items-center gap-2 px-2">
          <Image src={modelMark} alt="" width={28} height={28} className="size-7 object-contain" />
          <div><span className="label-caps block text-on-secondary-container">{text.chat.history}</span></div>
        </div>
        <ConversationArchive locale={locale} onSessionSelect={(session) => restoreArchivedSession(session.id)} basePath={localPreview ? "/browser-assurance/playground" : "/playground"} headingId="desktop-chat-history-title" compact />
      </aside>

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          swipeStartRef.current = touch && touch.clientX <= 28 ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = swipeStartRef.current;
          const touch = event.changedTouches[0];
          swipeStartRef.current = null;
          if (!start || !touch || window.innerWidth >= 768) return;
          const deltaX = touch.clientX - start.x;
          const deltaY = touch.clientY - start.y;
          if (deltaX > 72 && Math.abs(deltaY) < 60) setMobileHistoryOpen(true);
        }}
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
              <button type="button" onClick={() => openWorkspace(undefined, "activity")} className={cn("hidden size-9 place-items-center rounded-xl border border-outline-variant text-on-secondary-container hover:border-primary hover:bg-surface-container-low hover:text-primary xl:grid", drawerOpen && "border-primary bg-surface-container-low text-primary")} aria-label={locale === "ru" ? "Что делает Erma" : "What Erma is doing"} aria-pressed={drawerOpen}><PanelRightOpen size={15} /></button>
              <button type="button" onClick={startNewDialog} disabled={chat.messages.length === 0} className="grid size-9 place-items-center rounded-xl border border-outline-variant text-on-secondary-container hover:border-primary hover:bg-surface-container-low hover:text-primary disabled:pointer-events-none disabled:opacity-30" aria-label={text.chat.newDialog}><SquarePen size={15} /></button>
            </div>
          </div>
        </header>

        <div className="sr-only" aria-live="polite" aria-atomic="true">{liveStatusLabel}</div>

        <div className="relative min-h-0 flex-1">
          <div ref={scrollRef} onScroll={handleTranscriptScroll} className="playground-transcript absolute inset-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-8 md:px-10" role="region" aria-label={text.chat.currentSession}>
            {chat.messages.length === 0 ? (
              <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center py-8">
                <div className="flex w-full max-w-2xl flex-col items-center px-1 text-center sm:px-6">
                  <h2 className="flex flex-wrap items-center justify-center gap-3 font-serif text-[31px] leading-[1.12] text-primary sm:text-[36px] md:text-[48px]">
                    <span>{locale === "ru" ? "С чего" : "Where should we"}</span>
                    <span className="inline-flex size-11 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-2 align-middle sm:size-14 sm:p-2.5"><Image src={modelMark} alt="" width={36} height={36} className="size-full object-contain" /></span>
                    <span>{locale === "ru" ? "начнём?" : "begin?"}</span>
                  </h2>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-on-secondary-container">{locale === "ru" ? "Просто опишите задачу. Erma сама решит, когда искать источники, читать файл, считать или писать код." : "Just describe the task. Erma decides when to search sources, read a file, calculate, or write code."}</p>
                </div>
              </div>
            ) : <ResponsiveMessageList {...messageListProps} />}
          </div>
          {showJumpLatest && <button type="button" onClick={jumpLatest} className="absolute bottom-3 left-1/2 z-20 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 text-[12px] font-medium text-primary shadow-lg sm:bottom-4"><ArrowDown size={14} />{locale === "ru" ? "К последнему" : "Jump to latest"}</button>}
        </div>

        <div className="chat-composer-area safe-area-bottom w-full shrink-0 border-t border-outline-variant bg-surface/96 px-3 pb-2 pt-2 backdrop-blur-md sm:px-5 sm:pb-3 sm:pt-3 md:px-8">
          {rewardQuotaError && (
            <div className="mx-auto mb-2 flex w-full max-w-[780px] items-center gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 px-3 py-2.5 text-primary shadow-sm">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-on-secondary"><Gift size={15} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">{locale === "ru" ? "Получить ещё один запрос" : "Unlock one more request"}</p>
              </div>
              <button type="button" onClick={() => setRewardGateOpen(true)} disabled={chat.isPending} className="min-h-9 shrink-0 rounded-full border border-secondary/40 px-3 text-[10px] font-medium hover:bg-secondary/10 disabled:opacity-40">{locale === "ru" ? "Открыть" : "Open"}</button>
            </div>
          )}
          {promptEditBranch && (
            <div data-branch-preserving-edit className="mx-auto mb-2 flex w-full max-w-[780px] items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-primary shadow-sm">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-on-primary"><GitBranch size={15} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">{locale === "ru" ? (promptEditBranch.submitted ? "Изменённая ветка создана" : "Редактирование запроса") : (promptEditBranch.submitted ? "Edited branch created" : "Edit prompt")}</p>
                <p className="mt-0.5 truncate text-[10px] text-on-secondary-container">{locale === "ru" ? "Исходный диалог сохранён" : "Original conversation preserved"}: {promptEditBranch.sourceTitle}</p>
              </div>
              <button type="button" onClick={returnToOriginalConversation} disabled={chat.isPending} className="min-h-9 shrink-0 rounded-full border border-primary/30 px-3 text-[10px] font-medium hover:bg-primary/10 disabled:opacity-40">{locale === "ru" ? (promptEditBranch.submitted ? "Исходный" : "Отменить") : (promptEditBranch.submitted ? "Original" : "Cancel")}</button>
              <button type="button" onClick={() => setPromptEditBranch(null)} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-primary/10" aria-label={text.chat.close}><X size={14} /></button>
            </div>
          )}
          {contextWarning && <button type="button" onClick={() => openWorkspace(undefined, "context")} className="mx-auto mb-2 flex w-full max-w-[780px] items-center justify-center rounded-xl px-2 py-1 text-[10px] text-error hover:bg-error-container sm:text-[11px]">{locale === "ru" ? "Контекст почти заполнен — посмотреть" : "Context is almost full — review"}</button>}
          <ResponsiveChatComposer
            ref={promptRef}
            value={input}
            onChange={setInput}
            onSubmit={handlePromptSubmit}
            models={chatModels}
            selectedModelId={selectedModelId}
            onModelChange={setSelectedModelId}
            onAttachmentsChange={handleAttachmentsChange}
            busy={chat.isPending}
            onStop={chat.stopGeneration}
            maxLength={promptLimit}
            placeholder={text.chat.promptPlaceholder}
            attachmentsEnabled
            maxAttachmentBytes={access?.unlimited ? 64 * 1024 : 16 * 1024}
            maxAttachmentContextLength={access?.unlimited ? 31_500 : 7_500}
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
        project={currentProject}
        onClose={() => setDrawerOpen(false)}
        onProjectChange={updateProject}
      />

      <MobileChatDrawer
        open={mobileHistoryOpen}
        locale={locale}
        onClose={() => setMobileHistoryOpen(false)}
        onNewChat={startNewDialog}
        onOpenArtifacts={onOpenArtifacts}
        onOpenRuns={onOpenRuns}
      />

      <RewardedAdGate
        open={rewardGateOpen && Boolean(rewardQuotaError)}
        locale={locale}
        onClose={() => setRewardGateOpen(false)}
        onUseReward={useRewardRequest}
      />
    </div>
  );
}
