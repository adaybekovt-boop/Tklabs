"use client";

import { Activity, BookOpenText, FileText, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AgentActivity } from "@/components/playground/AgentActivity";
import type { ChatMessage } from "@/components/playground/MessageList";
import type { ChatInputAttachment, ChatInputModel } from "@/components/ui/ai-chat-input";
import type { ChatContextStats } from "@/hooks/use-chat-request";
import type { ChatResponseMode } from "@/lib/chat-modes";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LegacyDrawerTab = "context" | "files" | "sources" | "settings" | "activity";
type DrawerTab = "activity" | "context";

type ChatContextDrawerProps = {
  open: boolean;
  initialTab?: LegacyDrawerTab;
  locale: Locale;
  messages: ChatMessage[];
  contextStats: ChatContextStats;
  attachments: ChatInputAttachment[];
  models: ChatInputModel[];
  compareModel: string;
  responseMode: ChatResponseMode;
  reasonEnabled: boolean;
  project: string;
  onClose: () => void;
  onCompareModelChange: (model: string) => void;
  onCompareLast: () => void;
  onResponseModeChange: (mode: ChatResponseMode) => void;
  onReasonEnabledChange: (enabled: boolean) => void;
  onProjectChange: (project: string) => void;
};

export function ChatContextDrawer(props: ChatContextDrawerProps) {
  const {
    open,
    initialTab = "context",
    locale,
    messages,
    contextStats,
    attachments,
    project,
    onClose,
    onProjectChange,
  } = props;
  const [tab, setTab] = useState<DrawerTab>(initialTab === "activity" || initialTab === "sources" ? "activity" : "context");
  const [projectDraft, setProjectDraft] = useState(project);
  const toolCalls = useMemo(() => messages.flatMap((message) => message.meta?.toolCalls ?? []), [messages]);
  const contextRatio = Math.min(1, contextStats.estimatedTokens / Math.max(1, contextStats.limit));

  const labels = locale === "ru"
    ? {
        title: "Диалог",
        activity: "Что делает Erma",
        context: "Контекст",
        noActivity: "Erma пока не использовала инструменты в этом диалоге.",
        contextReady: "Контекст в норме",
        contextWarning: "Контекст близок к лимиту",
        messages: "сообщений в контексте",
        files: "Файлы",
        emptyFiles: "Файлы не прикреплены.",
        project: "Название проекта",
        saveProject: "Сохранить",
      }
    : {
        title: "Conversation",
        activity: "What Erma is doing",
        context: "Context",
        noActivity: "Erma has not used tools in this conversation yet.",
        contextReady: "Context is healthy",
        contextWarning: "Context is close to the limit",
        messages: "messages in context",
        files: "Files",
        emptyFiles: "No files attached.",
        project: "Project name",
        saveProject: "Save",
      };

  if (!open) return null;

  return (
    <aside className="hidden h-full w-[330px] shrink-0 flex-col border-l border-outline-variant bg-surface-container-lowest xl:flex" aria-label={labels.title} data-chat-context-drawer>
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-outline-variant px-4">
        <div>
          <p className="label-caps text-on-secondary-container">ERMA</p>
          <h2 className="mt-1 text-sm font-medium text-primary">{labels.title}</h2>
        </div>
        <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container-low hover:text-primary" aria-label="Close"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-2 gap-1 border-b border-outline-variant p-2">
        <button type="button" onClick={() => setTab("activity")} aria-pressed={tab === "activity"} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl text-[11px] text-on-secondary-container", tab === "activity" && "bg-surface-container-low text-primary")}><Activity size={15} />{labels.activity}</button>
        <button type="button" onClick={() => setTab("context")} aria-pressed={tab === "context"} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl text-[11px] text-on-secondary-container", tab === "context" && "bg-surface-container-low text-primary")}><BookOpenText size={15} />{labels.context}</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "activity" && (
          toolCalls.length
            ? <AgentActivity calls={toolCalls} locale={locale} open />
            : <p className="rounded-2xl bg-surface-container-low p-4 text-sm leading-6 text-on-secondary-container">{labels.noActivity}</p>
        )}

        {tab === "context" && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-outline-variant bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-primary">{contextRatio >= 0.8 ? labels.contextWarning : labels.contextReady}</p>
                <span className={cn("text-xs", contextRatio >= 0.8 ? "text-error" : "text-on-secondary-container")}>{Math.round(contextRatio * 100)}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container"><span className={cn("block h-full rounded-full", contextRatio >= 0.8 ? "bg-error" : "bg-primary")} style={{ width: `${Math.max(4, contextRatio * 100)}%` }} /></div>
              <p className="mt-3 text-xs text-on-secondary-container">{contextStats.messages} {labels.messages}</p>
            </section>

            <section className="rounded-2xl border border-outline-variant bg-surface p-4">
              <p className="label-caps mb-3 flex items-center gap-2 text-on-secondary-container"><FileText size={14} />{labels.files}</p>
              {attachments.length
                ? <div className="space-y-2">{attachments.map((attachment) => <div key={attachment.id} className="rounded-xl bg-surface-container-low px-3 py-2"><p className="truncate text-xs font-medium text-primary">{attachment.name}</p><p className="mt-1 text-[10px] text-on-secondary-container">{attachment.content.length.toLocaleString()} chars</p></div>)}</div>
                : <p className="text-xs leading-5 text-on-secondary-container">{labels.emptyFiles}</p>}
            </section>

            <section className="rounded-2xl border border-outline-variant bg-surface p-4">
              <label className="label-caps mb-2 block text-on-secondary-container" htmlFor="workspace-project">{labels.project}</label>
              <div className="flex gap-2">
                <input id="workspace-project" value={projectDraft} onChange={(event) => setProjectDraft(event.target.value.slice(0, 80))} className="h-11 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary" />
                <button type="button" onClick={() => onProjectChange(projectDraft)} className="min-h-11 rounded-xl bg-primary px-3 text-xs text-on-primary">{labels.saveProject}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
