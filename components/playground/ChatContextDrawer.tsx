"use client";

import { BookOpenText, FileText, GitCompareArrows, Settings2, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { ChatContextStats } from "@/hooks/use-chat-request";
import { CHAT_RESPONSE_MODES, chatResponseModeLabel, type ChatResponseMode } from "@/lib/chat-modes";
import type { Locale } from "@/lib/i18n";
import type { ChatInputAttachment, ChatInputModel } from "@/components/ui/ai-chat-input";
import type { ChatMessage } from "@/components/playground/MessageList";
import { cn } from "@/lib/utils";

type DrawerTab = "context" | "files" | "sources" | "settings";

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
  initialTab?: DrawerTab;
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
  const [tab, setTab] = useState<DrawerTab>(initialTab);
  const [projectDraft, setProjectDraft] = useState(project);
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.content && !message.error);
  const sources = useMemo(() => {
    const result = new Set<string>();
    for (const message of messages) {
      for (const match of message.content.matchAll(/https?:\/\/[^\s)\]}]+/g)) result.add(match[0]);
    }
    return [...result].slice(0, 20);
  }, [messages]);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US"), [locale]);
  const labels = locale === "ru"
    ? {
        title: "Контекст и параметры",
        context: "Контекст",
        files: "Файлы",
        sources: "Источники",
        settings: "Параметры",
        tokens: "токенов",
        messages: "сообщений",
        attachments: "файлов",
        compacted: "Старые сообщения свёрнуты в память контекста.",
        emptyFiles: "Файлы появятся здесь после прикрепления к сообщению.",
        emptySources: "В ответах этого диалога пока нет ссылок на источники.",
        compare: "Сравнить последний ответ",
        compareModel: "Вторая модель",
        noAnswer: "Сначала получите ответ модели.",
        mode: "Режим ответа",
        reasoning: "Глубокое рассуждение",
        project: "Проект",
        saveProject: "Сохранить проект",
      }
    : {
        title: "Context and settings",
        context: "Context",
        files: "Files",
        sources: "Sources",
        settings: "Settings",
        tokens: "tokens",
        messages: "messages",
        attachments: "files",
        compacted: "Older messages were compacted into context memory.",
        emptyFiles: "Files appear here after they are attached to a message.",
        emptySources: "No source links have appeared in this conversation yet.",
        compare: "Compare latest answer",
        compareModel: "Second model",
        noAnswer: "Generate an answer first.",
        mode: "Response mode",
        reasoning: "Deep reasoning",
        project: "Project",
        saveProject: "Save project",
      };

  if (!open) return null;

  const tabs: Array<{ id: DrawerTab; label: string; icon: typeof FileText }> = [
    { id: "context", label: labels.context, icon: BookOpenText },
    { id: "files", label: labels.files, icon: FileText },
    { id: "sources", label: labels.sources, icon: SlidersHorizontal },
    { id: "settings", label: labels.settings, icon: Settings2 },
  ];

  return (
    <aside className="hidden h-full w-[330px] shrink-0 flex-col border-l border-outline-variant bg-surface-container-lowest xl:flex" aria-label={labels.title} data-chat-context-drawer>
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-outline-variant px-4">
        <div>
          <p className="label-caps text-on-secondary-container">AI WORKSPACE</p>
          <h2 className="mt-1 text-sm font-medium text-primary">{labels.title}</h2>
        </div>
        <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container-low hover:text-primary" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-4 border-b border-outline-variant p-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] text-on-secondary-container", tab === id && "bg-surface-container-low text-primary")}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "context" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-outline-variant bg-surface p-4">
              <p className="text-2xl font-semibold text-primary">{numberFormat.format(contextStats.estimatedTokens)}</p>
              <p className="mt-1 text-xs text-on-secondary-container">{labels.tokens} / {numberFormat.format(contextStats.limit)}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (contextStats.estimatedTokens / Math.max(1, contextStats.limit)) * 100)}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-surface-container-low p-3"><strong className="block text-lg text-primary">{contextStats.messages}</strong>{labels.messages}</div>
              <div className="rounded-2xl bg-surface-container-low p-3"><strong className="block text-lg text-primary">{attachments.length}</strong>{labels.attachments}</div>
            </div>
            {contextStats.compacted && <p className="rounded-2xl border border-outline-variant p-3 text-xs leading-5 text-on-secondary-container">{labels.compacted}</p>}
          </div>
        )}

        {tab === "files" && (
          attachments.length ? (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="rounded-2xl border border-outline-variant bg-surface p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary"><FileText size={15} /><span className="truncate">{attachment.name}</span></div>
                  <p className="mt-2 text-xs text-on-secondary-container">{numberFormat.format(attachment.file.size)} B · {numberFormat.format(attachment.content.length)} chars</p>
                </div>
              ))}
            </div>
          ) : <p className="rounded-2xl bg-surface-container-low p-4 text-sm leading-6 text-on-secondary-container">{labels.emptyFiles}</p>
        )}

        {tab === "sources" && (
          sources.length ? (
            <ol className="space-y-2">
              {sources.map((source) => <li key={source}><a href={source} target="_blank" rel="noreferrer noopener" className="block break-all rounded-2xl border border-outline-variant p-3 text-xs leading-5 text-primary hover:bg-surface-container-low">{source}</a></li>)}
            </ol>
          ) : <p className="rounded-2xl bg-surface-container-low p-4 text-sm leading-6 text-on-secondary-container">{labels.emptySources}</p>
        )}

        {tab === "settings" && (
          <div className="space-y-5">
            <section>
              <p className="label-caps mb-2 text-on-secondary-container">{labels.mode}</p>
              <div className="grid gap-2">
                {CHAT_RESPONSE_MODES.map((mode) => (
                  <button key={mode} type="button" onClick={() => onResponseModeChange(mode)} className={cn("min-h-11 rounded-xl border px-3 text-left text-xs", responseMode === mode ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface")}>{chatResponseModeLabel(mode, locale)}</button>
                ))}
              </div>
            </section>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface p-3 text-sm text-primary">
              {labels.reasoning}
              <input type="checkbox" checked={reasonEnabled} onChange={(event) => onReasonEnabledChange(event.target.checked)} className="size-5 accent-current" />
            </label>
            <section>
              <label className="label-caps mb-2 block text-on-secondary-container" htmlFor="workspace-project">{labels.project}</label>
              <div className="flex gap-2">
                <input id="workspace-project" value={projectDraft} onChange={(event) => setProjectDraft(event.target.value.slice(0, 80))} className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface px-3 text-sm outline-none focus:border-primary" />
                <button type="button" onClick={() => onProjectChange(projectDraft)} className="min-h-11 rounded-xl bg-primary px-3 text-xs text-on-primary">{labels.saveProject}</button>
              </div>
            </section>
            <section className="rounded-2xl border border-outline-variant bg-surface p-3">
              <label className="label-caps mb-2 block text-on-secondary-container" htmlFor="compare-model">{labels.compareModel}</label>
              <select id="compare-model" value={compareModel} onChange={(event) => onCompareModelChange(event.target.value)} className="h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 text-sm text-primary">
                {models.filter((model) => model.available).map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
              </select>
              <button type="button" onClick={onCompareLast} disabled={!lastAssistant || !compareModel} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs text-on-primary disabled:opacity-30"><GitCompareArrows size={15} />{labels.compare}</button>
              {!lastAssistant && <p className="mt-2 text-xs text-on-secondary-container">{labels.noAnswer}</p>}
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
