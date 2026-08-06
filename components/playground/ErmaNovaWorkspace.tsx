"use client";

/* eslint-disable react-hooks/set-state-in-effect -- browser-only workspace state hydrates from localStorage. */

import { useEffect, useState } from "react";
import { Activity, FileText, MessageSquareText, Sparkles } from "lucide-react";

import { AgentRunPanel } from "@/components/playground/AgentRunPanel";
import { ArtifactStudio } from "@/components/playground/ArtifactStudio";
import { PlaygroundChat } from "@/components/playground/PlaygroundChat";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type WorkspaceTab = "chat" | "artifacts" | "runs";
const STORAGE_KEY = "tklabs.erma-nova.workspace-tab";

export function ErmaNovaWorkspace({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [tab, setTab] = useState<WorkspaceTab>("chat");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "chat" || saved === "artifacts" || saved === "runs") setTab(saved);
  }, []);

  function selectTab(next: WorkspaceTab) {
    setTab(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof MessageSquareText }> = [
    { id: "chat", label: ru ? "Чат" : "Chat", icon: MessageSquareText },
    { id: "artifacts", label: ru ? "Артефакты" : "Artifacts", icon: FileText },
    { id: "runs", label: "Agent Runs", icon: Activity },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface" data-erma-nova-workspace>
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest/95 px-3 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-on-primary"><Sparkles className="size-4" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">Erma Nova</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">Major update · pre-release</p>
            </div>
          </div>
          <nav className="flex items-center rounded-full border border-outline-variant bg-surface-container-low p-1" aria-label={ru ? "Рабочее пространство Erma Nova" : "Erma Nova workspace"}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={cn("inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors sm:px-4", tab === id ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface")}
              >
                <Icon className="size-3.5" /><span className={id === "runs" ? "hidden sm:inline" : ""}>{label}</span>
              </button>
            ))}
          </nav>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">v0.16 beta.1</span>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={cn("h-full min-h-0", tab !== "chat" && "hidden")} aria-hidden={tab !== "chat"}>
          <PlaygroundChat locale={locale} />
        </div>
        {tab === "artifacts" ? <ArtifactStudio locale={locale} /> : null}
        {tab === "runs" ? <AgentRunPanel locale={locale} /> : null}
      </div>
    </div>
  );
}
