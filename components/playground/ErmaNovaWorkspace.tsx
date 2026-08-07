"use client";

/* eslint-disable react-hooks/set-state-in-effect -- browser-only workspace state hydrates from localStorage. */

import { lazy, Suspense, useEffect, useState } from "react";
import { Activity, ChevronLeft, FileText, MessageSquareText, Sparkles, Workflow } from "lucide-react";

import { LanguageToggle } from "@/components/site/LanguageToggle";
import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_BADGE } from "@/lib/release-version";
import { isWorkspaceSection, WORKSPACE_SECTION_EVENT, type WorkspaceSection } from "@/lib/workspace-events";
import { cn } from "@/lib/utils";

const PlaygroundChat = lazy(() => import("@/components/playground/PlaygroundChat").then((module) => ({ default: module.PlaygroundChat })));
const ErmaFlowStudio = lazy(() => import("@/components/playground/ErmaFlowStudio").then((module) => ({ default: module.ErmaFlowStudio })));
const ArtifactStudio = lazy(() => import("@/components/playground/ArtifactStudio").then((module) => ({ default: module.ArtifactStudio })));
const AgentRunPanel = lazy(() => import("@/components/playground/AgentRunPanel").then((module) => ({ default: module.AgentRunPanel })));

const STORAGE_KEY = "tklabs.erma-nova.workspace-tab";

function readSavedTab(): WorkspaceSection | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isWorkspaceSection(saved) ? saved : null;
  } catch {
    return null;
  }
}

function saveTab(tab: WorkspaceSection) {
  try {
    window.localStorage.setItem(STORAGE_KEY, tab);
  } catch {
    // Workspace navigation remains usable when storage is blocked or unavailable.
  }
}

function WorkspacePanelFallback({ locale }: { locale: Locale }) {
  return (
    <div className="grid h-full min-h-0 place-items-center bg-surface" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-xs text-on-surface-variant shadow-sm">
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        {locale === "ru" ? "Открываю рабочую область…" : "Opening workspace…"}
      </div>
    </div>
  );
}

export function ErmaNovaWorkspace({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [tab, setTab] = useState<WorkspaceSection>("chat");

  useEffect(() => {
    const saved = readSavedTab();
    if (saved) setTab(saved);
  }, []);

  useEffect(() => {
    function handleWorkspaceRequest(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isWorkspaceSection(detail)) return;
      setTab(detail);
      saveTab(detail);
    }
    window.addEventListener(WORKSPACE_SECTION_EVENT, handleWorkspaceRequest);
    return () => window.removeEventListener(WORKSPACE_SECTION_EVENT, handleWorkspaceRequest);
  }, []);

  function selectTab(next: WorkspaceSection) {
    setTab(next);
    saveTab(next);
  }

  const tabs: Array<{ id: WorkspaceSection; label: string; icon: typeof MessageSquareText }> = [
    { id: "chat", label: ru ? "Чат" : "Chat", icon: MessageSquareText },
    { id: "flow", label: "Erma Flow", icon: Workflow },
    { id: "artifacts", label: ru ? "Артефакты" : "Artifacts", icon: FileText },
    { id: "runs", label: "Agent Runs", icon: Activity },
  ];
  const mobileSectionTitle = tab === "flow"
    ? "Erma Flow"
    : tab === "artifacts"
      ? ru ? "Артефакты" : "Artifacts"
      : "Agent Runs";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface" data-erma-nova-workspace data-active-workspace={tab}>
      {tab !== "chat" && (
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest/95 px-3 backdrop-blur-md md:hidden">
          <button type="button" onClick={() => selectTab("chat")} className="grid size-11 place-items-center rounded-full text-primary hover:bg-surface-container-low" aria-label={ru ? "Вернуться в чат" : "Back to chat"}><ChevronLeft size={20} /></button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-primary">{mobileSectionTitle}</p>
          <div className="flex min-h-10 items-center rounded-xl border border-outline-variant bg-surface px-2"><LanguageToggle locale={locale} label={ru ? "Язык интерфейса" : "Interface language"} /></div>
        </header>
      )}

      <header className="hidden min-h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-lowest/95 px-5 backdrop-blur-md md:flex">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-on-primary"><Sparkles className="size-4" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">Erma Flow</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">Motion system · controlled runs</p>
            </div>
          </div>
          <nav
            role="tablist"
            className="flex min-w-0 max-w-full items-center overflow-x-auto rounded-full border border-outline-variant bg-surface-container-low p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={ru ? "Рабочее пространство Erma Flow" : "Erma Flow workspace"}
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
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-medium transition-colors",
                  tab === id ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface",
                )}
              >
                <Icon className="size-3.5" />
                <span>{label}</span>
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
          className={cn("h-full min-h-0 motion-workspace-panel", tab !== "chat" && "hidden")}
          hidden={tab !== "chat"}
        >
          <Suspense fallback={<WorkspacePanelFallback locale={locale} />}>
            <PlaygroundChat locale={locale} onOpenArtifacts={() => selectTab("artifacts")} onOpenRuns={() => selectTab("runs")} />
          </Suspense>
        </div>
        {tab === "flow" ? (
          <div id="workspace-panel-flow" role="tabpanel" aria-labelledby="workspace-tab-flow" className="h-full min-h-0 motion-workspace-panel">
            <Suspense fallback={<WorkspacePanelFallback locale={locale} />}><ErmaFlowStudio locale={locale} /></Suspense>
          </div>
        ) : null}
        {tab === "artifacts" ? (
          <div id="workspace-panel-artifacts" role="tabpanel" aria-labelledby="workspace-tab-artifacts" className="h-full min-h-0 motion-workspace-panel">
            <Suspense fallback={<WorkspacePanelFallback locale={locale} />}><ArtifactStudio locale={locale} /></Suspense>
          </div>
        ) : null}
        {tab === "runs" ? (
          <div id="workspace-panel-runs" role="tabpanel" aria-labelledby="workspace-tab-runs" className="h-full min-h-0 motion-workspace-panel">
            <Suspense fallback={<WorkspacePanelFallback locale={locale} />}><AgentRunPanel locale={locale} /></Suspense>
          </div>
        ) : null}
      </div>
    </div>
  );
}
