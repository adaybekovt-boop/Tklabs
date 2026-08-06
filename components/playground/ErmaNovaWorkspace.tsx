"use client";

/* eslint-disable react-hooks/set-state-in-effect -- browser-only workspace state hydrates from localStorage. */

import { useEffect, useState } from "react";
import { Activity, FileText, MessageSquareText, Sparkles } from "lucide-react";

import { AgentRunPanel } from "@/components/playground/AgentRunPanel";
import { ArtifactStudio } from "@/components/playground/ArtifactStudio";
import { PlaygroundChat } from "@/components/playground/PlaygroundChat";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_BADGE } from "@/lib/release-version";
import { cn } from "@/lib/utils";

type WorkspaceTab = "chat" | "artifacts" | "runs";
const STORAGE_KEY = "tklabs.erma-nova.workspace-tab";

function readSavedTab(): WorkspaceTab | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "chat" || saved === "artifacts" || saved === "runs" ? saved : null;
  } catch {
    return null;
  }
}

function saveTab(tab: WorkspaceTab) {
  try {
    window.localStorage.setItem(STORAGE_KEY, tab);
  } catch {
    // Workspace navigation remains usable when storage is blocked or unavailable.
  }
}

export function ErmaNovaWorkspace({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [tab, setTab] = useState<WorkspaceTab>("chat");

  useEffect(() => {
    const saved = readSavedTab();
    if (saved) setTab(saved);
  }, []);

  function selectTab(next: WorkspaceTab) {
    setTab(next);
    saveTab(next);
  }

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof MessageSquareText }> = [
    { id: "chat", label: ru ? "Чат" : "Chat", icon: MessageSquareText },
    { id: "artifacts", label: ru ? "Артефакты" : "Artifacts", icon: FileText },
    { id: "runs", label: "Agent Runs", icon: Activity },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface" data-erma-nova-workspace>
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-lowest/95 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-on-primary"><Sparkles className="size-4" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">Erma Nova</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">Major update · pre-release</p>
            </div>
          </div>
          <nav
            role="tablist"
            className="flex min-w-0 max-w-full items-center overflow-x-auto rounded-full border border-outline-variant bg-surface-container-low p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={ru ? "Рабочее пространство Erma Nova" : "Erma Nova workspace"}
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`workspace-tab-${id}`}
                type="button"
                role="tab"
                onClick={() => selectTab(id)}
                aria-selected={tab === id}
                aria-controls={`workspace-panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors sm:px-4",
                  tab === id ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface",
                )}
              >
                <Icon className="size-3.5" />
                <span className={id === "runs" ? "hidden sm:inline" : ""}>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex min-h-9 items-center rounded-full border border-outline-variant bg-surface px-2.5">
            <LanguageToggle locale={locale} label={ru ? "Язык интерфейса" : "Interface language"} />
          </div>
          <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:inline-flex">
            {CURRENT_RELEASE_BADGE}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          id="workspace-panel-chat"
          role="tabpanel"
          aria-labelledby="workspace-tab-chat"
          className={cn("h-full min-h-0", tab !== "chat" && "hidden")}
          hidden={tab !== "chat"}
        >
          <PlaygroundChat locale={locale} />
        </div>
        {tab === "artifacts" ? (
          <div id="workspace-panel-artifacts" role="tabpanel" aria-labelledby="workspace-tab-artifacts" className="h-full min-h-0">
            <ArtifactStudio locale={locale} />
          </div>
        ) : null}
        {tab === "runs" ? (
          <div id="workspace-panel-runs" role="tabpanel" aria-labelledby="workspace-tab-runs" className="h-full min-h-0">
            <AgentRunPanel locale={locale} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
