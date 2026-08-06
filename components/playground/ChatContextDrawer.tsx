"use client";

import { Activity, BookOpenText, FileText, GitCompareArrows, Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AgentActivity } from "@/components/playground/AgentActivity";
import type { ChatMessage } from "@/components/playground/MessageList";
import type { ChatInputAttachment, ChatInputModel } from "@/components/ui/ai-chat-input";
import type { ChatContextStats } from "@/hooks/use-chat-request";
import { CHAT_RESPONSE_MODES, chatResponseModeLabel, type ChatResponseMode } from "@/lib/chat-modes";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LegacyDrawerTab = "context" | "files" | "sources" | "settings" | "activity";
type DrawerTab = "activity" | "context";

export function ChatContextDrawer({
  open,
  initialTab = "context",
  locale,
  messages,
  contextStats,
  attachments,
  models,
  compareModel,
  responseMode,
  reasonEnabled,
  project,
  onClose,
  onCompareModelChange,
  onCompareLast,
  onResponseModeChange,
  onReasonEnabledChange,
  onProjectChange,
}: {
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
}) {
  const [tab, setTab] = useState<DrawerTab>(initialTab === "activity" || initialTab === "sources" ? "activity" : "context");
  const [projectDraft, setProjectDraft] = useState(project);
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.content && !message.error);
  const toolCalls = useMemo(() => messages.flatMap((message) => message.meta?.toolCalls ?? []), [messages]);
  const contextRatio = Math.min(1, contextStats.estimatedTokens / Math.max(1, contextStats.limit));

  const labels = locale === "ru"
    ? { title: "Рабочая область", activity: "Активность", context: "Контекст", noActivity: "В этом диалоге инструменты пока не использовались.", contextReady: "Контекст в норме", contextWarning: "Контекст близок к лимиту", messages: "сообщений участвуют в ответе", files: "Файлы", emptyFiles: "Текстовые файлы не прикреплены.", project: "Проект", saveProject: "Сохранить", advanced: "Расширенные настройки", mode: "Формат ответа", reasoning: "Глубокое рассуждение", compare: "Сравнить последний ответ", compareModel: "Вторая модель", noAnswer: "Сначала получите ответ модели." }
    : { title: "Workspace", activity: "Activity", context: "Context", noActivity: "No tools have been used in this conversation.", contextReady: "Context is healthy", contextWarning: "Context is close to the limit", messages: "messages included", files: "Files", emptyFiles: "No text files attached.", project: "Project", saveProject: "Save", advanced: "Advanced settings", mode: "Response format", reasoning: "Deep reasoning", compare: "Compare latest answer", compareModel: "Second model", noAnswer: "Generate an answer first." };

  if (!open) return null;

  return (
    <aside className="hidden h-full w-[330px] shrink-0 flex-col border-l border-outline-variant bg-surface-container-lowest xl:flex" aria-label={labels.title} data-chat-context-drawer>
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-outline-variant px-4">
        <div><p className="label-caps text-on-secondary-container">ERMA WORKSPACE</p><h2 className="mt-1 text-sm font-medium text-primary">{labels.title}</h2></div>
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
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-primary">{contextRatio >= 0.8 ? labels.contextWarning : labels.contextReady}</p><span className={cn("text-xs", contextRatio >= 0.8 ? "text-error" : "text-on-secondary-container")}>{Math.round(contextRatio * 100)}%</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container"><span className={cn("block h-full rounded-full", contextRatio >= 0.8 ? "bg-error" : "bg-primary")} style={{ width: `${Math.max(4, contextRatio * 100)}%` }} /></div>
              <p className="mt-3 text-xs text-on-secondary-container">{contextStats.messages} {labels.messages}</p>
            </section>

            <section className="rounded-2xl border border-outline-variant bg-surface p-4">
              <p className="label-caps mb-3 flex items-center gap-2 text-on-secondary-container"><FileText size={14} />{labels.files}</p>
              {attachments.length ? <div className="space-y-2">{attachments.map((attachment) => <div key={attachment.id} className="rounded-xl bg-surface-container-low px-3 py-2"><p className="truncate text-xs font-medium text-primary">{attachment.name}</p><p className="mt-1 text-[10px] text-on-secondary-container">{attachment.content.length.toLocaleString()} chars</p></div>)}</div> : <p className="text-xs leading-5 text-on-secondary-container">{labels.emptyFiles}</p>}
            </section>

            <section className="rounded-2xl border border-outline-variant bg-surface p-4">
              <label className="label-caps mb-2 block text-on-secondary-container" htmlFor="workspace-project">{labels.project}</label>
              <div className="flex gap-2"><input id="workspace-project" value={projectDraft} onChange={(event) => setProjectDraft(event.target.value.slice(0, 80))} className="h-11 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary" /><button type="button" onClick={() => onProjectChange(projectDraft)} className="min-h-11 rounded-xl bg-primary px-3 text-xs text-on-primary">{labels.saveProject}</button></div>
            </section>

            <details className="group rounded-2xl border border-outline-variant bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-xs font-medium text-primary [&::-webkit-details-marker]:hidden"><Settings2 size={15} />{labels.advanced}</summary>
              <div className="space-y-5 border-t border-outline-variant p-4">
                <section><p className="label-caps mb-2 text-on-secondary-container">{labels.mode}</p><div className="grid gap-2">{CHAT_RESPONSE_MODES.map((mode) => <button key={mode} type="button" onClick={() => onResponseModeChange(mode)} className={cn("min-h-10 rounded-xl border px-3 text-left text-xs", responseMode === mode ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest")}>{chatResponseModeLabel(mode, locale)}</button>)}</div></section>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-xs text-primary">{labels.reasoning}<input type="checkbox" checked={reasonEnabled} onChange={(event) => onReasonEnabledChange(event.target.checked)} className="size-5 accent-current" /></label>
                <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3"><label className="label-caps mb-2 block text-on-secondary-container" htmlFor="compare-model">{labels.compareModel}</label><select id="compare-model" value={compareModel} onChange={(event) => onCompareModelChange(event.target.value)} className="h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 text-sm text-primary">{models.filter((model) => model.available).map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select><button type="button" onClick={onCompareLast} disabled={!lastAssistant || !compareModel} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs text-on-primary disabled:opacity-30"><GitCompareArrows size={15} />{labels.compare}</button>{!lastAssistant && <p className="mt-2 text-xs text-on-secondary-container">{labels.noAnswer}</p>}</section>
              </div>
            </details>
          </div>
        )}
      </div>
    </aside>
  );
}
