"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Circle, FileText, Play, ShieldCheck, Square, Workflow, XCircle } from "lucide-react";

import { AGENT_RUN_PROTOCOL_VERSION } from "@/lib/ai/agent-run";
import { FLOW_RUNS_UPDATED_EVENT, loadFlowRuns, type FlowRun } from "@/lib/flow/local-store";
import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_BADGE } from "@/lib/release-version";
import { requestWorkspaceSection } from "@/lib/workspace-events";
import { cn } from "@/lib/utils";

function RunIcon({ status }: { status: FlowRun["status"] }) {
  if (status === "completed") return <CheckCircle2 className="size-5" />;
  if (status === "failed") return <XCircle className="size-5" />;
  if (status === "stopped") return <Square className="size-4" />;
  if (status === "planning" || status === "running") return <Activity className="size-5" />;
  return <Circle className="size-5" />;
}

export function AgentRunPanel({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const refresh = () => {
      const next = loadFlowRuns();
      setRuns(next);
      setSelectedId((current) => current && next.some((run) => run.id === current) ? current : next[0]?.id ?? "");
    };
    refresh();
    window.addEventListener(FLOW_RUNS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FLOW_RUNS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const selected = runs.find((run) => run.id === selectedId) ?? runs[0] ?? null;
  const activeCount = useMemo(() => runs.filter((run) => run.status === "planning" || run.status === "running").length, [runs]);
  const completedCount = useMemo(() => runs.filter((run) => run.status === "completed").length, [runs]);

  return (
    <section className="h-full overflow-y-auto bg-surface p-4 sm:p-8" data-agent-run-panel data-motion-section>
      <div className="mx-auto max-w-6xl">
        <div className="flow-hero flex flex-col gap-6 rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:p-8 md:flex-row md:items-start md:justify-between" data-motion-card>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Activity className="size-3.5" />Agent Runs v{AGENT_RUN_PROTOCOL_VERSION}
            </div>
            <h1 className="mt-5 font-serif text-4xl leading-tight text-on-surface sm:text-5xl">{ru ? "История управляемых задач" : "Controlled task history"}</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-on-surface-variant">{ru ? "Здесь сохраняются реальные Erma Flow запуски: полезные этапы, состояние, итог и созданные артефакты. Скрытые рассуждения модели не публикуются." : "This surface stores real Erma Flow runs: useful stages, status, outcome, and created artifacts. Hidden model reasoning is never exposed."}</p>
            <button type="button" onClick={() => requestWorkspaceSection("flow")} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-on-primary"><Play className="size-4" fill="currentColor" />{ru ? "Новый Flow" : "New Flow"}</button>
          </div>
          <div className="relative z-10 rounded-2xl border border-outline-variant bg-surface p-4 text-sm leading-6 text-on-surface-variant md:w-72">
            <div className="flex items-center gap-2 font-medium text-on-surface"><ShieldCheck className="size-4 text-primary" />{ru ? "Границы системы" : "System boundaries"}</div>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-secondary">{CURRENT_RELEASE_BADGE}</p>
            <p className="mt-2">{ru ? "Последовательное выполнение, Stop на любом этапе, безопасные read-only инструменты и явный конечный результат." : "Sequential execution, Stop at any stage, safe read-only tools, and an explicit final result."}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-surface-container-low px-3 py-2"><span className="block text-xl font-semibold text-on-surface">{activeCount}</span><span className="text-[11px]">{ru ? "активно" : "active"}</span></div>
              <div className="rounded-xl bg-surface-container-low px-3 py-2"><span className="block text-xl font-semibold text-on-surface">{completedCount}</span><span className="text-[11px]">{ru ? "готово" : "completed"}</span></div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-outline-variant bg-surface-container-low p-4 sm:p-5" data-motion-card>
            <div className="flex items-center gap-2"><Workflow className="size-5 text-primary" /><h2 className="font-serif text-2xl">{ru ? "Запуски" : "Runs"}</h2></div>
            <div className="mt-4 max-h-[56vh] space-y-2 overflow-y-auto pr-1">
              {runs.map((run, index) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedId(run.id)}
                  className={cn(
                    "flow-history-item w-full rounded-2xl border px-3 py-3 text-left",
                    selected?.id === run.id ? "border-primary bg-surface-container-lowest" : "border-outline-variant bg-surface hover:bg-surface-container-lowest",
                  )}
                  style={{ "--flow-history-index": index } as CSSProperties}
                >
                  <span className="flex items-start gap-2">
                    <span className={cn(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                      run.status === "completed" && "bg-primary text-on-primary",
                      (run.status === "planning" || run.status === "running") && "bg-chat-accent-soft text-primary",
                      run.status === "failed" && "bg-error/10 text-error",
                      run.status === "stopped" && "bg-surface-container-high text-on-surface-variant",
                    )}><RunIcon status={run.status} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium leading-5 text-on-surface">{run.title}</span>
                      <span className="mt-1 block text-[11px] text-on-secondary-container">{new Date(run.updatedAt).toLocaleString(ru ? "ru-RU" : "en-US")}</span>
                    </span>
                  </span>
                </button>
              ))}
              {!runs.length ? (
                <div className="rounded-2xl border border-dashed border-outline-variant bg-surface p-5 text-sm leading-6 text-on-surface-variant">
                  <p className="font-medium text-on-surface">{ru ? "Запусков пока нет" : "No runs yet"}</p>
                  <p className="mt-2">{ru ? "Создайте первую задачу в Erma Flow — она появится здесь автоматически." : "Create your first task in Erma Flow and it will appear here automatically."}</p>
                </div>
              ) : null}
            </div>
          </aside>

          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-7" data-motion-card>
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="label-caps text-secondary">Run timeline</p>
                    <h2 className="mt-2 text-2xl font-medium text-on-surface sm:text-3xl">{selected.title}</h2>
                    <p className="mt-2 text-xs text-on-secondary-container">{selected.actualModel || "Erma Auto"}{selected.requestId ? ` · ${selected.requestId}` : ""}</p>
                  </div>
                  {selected.artifactId ? <button type="button" onClick={() => requestWorkspaceSection("artifacts")} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-outline-variant px-4 text-xs font-medium"><FileText className="size-4" />{ru ? "Открыть артефакт" : "Open artifact"}</button> : null}
                </div>

                <div className="mt-6 space-y-3">
                  {selected.steps.map((step, index) => (
                    <div key={step.id} className="flow-step flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface px-4 py-3.5" data-state={step.status} style={{ "--flow-step-index": index } as CSSProperties}>
                      <span className={cn(
                        "flow-step-icon grid size-9 shrink-0 place-items-center rounded-full",
                        step.status === "completed" && "bg-primary text-on-primary",
                        step.status === "running" && "bg-chat-accent-soft text-primary",
                        step.status === "failed" && "bg-error/10 text-error",
                        (step.status === "pending" || step.status === "stopped") && "bg-surface-container-low text-on-secondary-container",
                      )}><RunIcon status={step.status === "pending" ? "planning" : step.status === "running" ? "running" : step.status === "completed" ? "completed" : step.status === "failed" ? "failed" : "stopped"} /></span>
                      <div className="min-w-0"><p className="text-sm font-medium text-on-surface">{step.title}</p>{step.detail ? <p className="mt-1 text-xs leading-5 text-on-secondary-container">{step.detail}</p> : null}</div>
                    </div>
                  ))}
                </div>

                {selected.result ? (
                  <div className="flow-result-enter mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
                    <p className="label-caps text-secondary">{ru ? "Итог" : "Outcome"}</p>
                    <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">{selected.result}</p>
                    <button type="button" onClick={() => requestWorkspaceSection("flow")} className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">{ru ? "Открыть полный Flow" : "Open full Flow"}<Workflow className="size-4" /></button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="grid min-h-[360px] place-items-center text-center">
                <div className="max-w-md">
                  <Activity className="mx-auto size-10 text-secondary" />
                  <h2 className="mt-4 font-serif text-3xl text-on-surface">{ru ? "Создайте первый Erma Flow" : "Create your first Erma Flow"}</h2>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">{ru ? "Timeline покажет только полезные этапы выполнения, инструменты и конечный результат." : "The timeline will show only useful execution stages, tools, and the final result."}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
