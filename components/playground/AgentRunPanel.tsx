"use client";

import { Activity, CheckCircle2, Circle, ShieldCheck, Workflow } from "lucide-react";

import { AGENT_RUN_PROTOCOL_VERSION } from "@/lib/ai/agent-run";
import type { Locale } from "@/lib/i18n";

export function AgentRunPanel({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const stages = ru
    ? ["Понять задачу", "Создать краткий план", "Выполнить безопасные шаги", "Собрать источники", "Подготовить ответ или артефакт", "Завершить или остановить run"]
    : ["Understand the task", "Create a short plan", "Run bounded safe steps", "Collect references", "Prepare an answer or artifact", "Complete or cancel the run"];

  return (
    <section className="h-full overflow-y-auto bg-surface p-4 sm:p-8" data-agent-run-panel>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:p-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Activity className="size-3.5" />Agent Runs v{AGENT_RUN_PROTOCOL_VERSION}
            </div>
            <h1 className="mt-5 font-serif text-4xl leading-tight text-on-surface sm:text-5xl">{ru ? "Управляемые многошаговые задачи" : "Controlled multi-step tasks"}</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-on-surface-variant">{ru ? "Erma Nova показывает только полезный рабочий прогресс: план, этап, инструменты, источники и итог. Скрытые рассуждения модели не публикуются." : "Erma Nova exposes useful work progress only: plan, stage, tools, references, and outcome. Hidden model reasoning is never published."}</p>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface p-4 text-sm leading-6 text-on-surface-variant md:w-72">
            <div className="flex items-center gap-2 font-medium text-on-surface"><ShieldCheck className="size-4 text-primary" />{ru ? "Границы beta.1" : "beta.1 boundaries"}</div>
            <p className="mt-2">{ru ? "До шести шагов, последовательное выполнение, Stop на любом этапе, без shell, eval и произвольного filesystem." : "Up to six steps, sequential execution, Stop at any stage, with no shell, eval, or arbitrary filesystem access."}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-7">
            <div className="flex items-center gap-2"><Workflow className="size-5 text-primary" /><h2 className="font-serif text-2xl">Run timeline</h2></div>
            <div className="mt-6 space-y-3">
              {stages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface px-4 py-3">
                  {index === 0 ? <CheckCircle2 className="size-5 shrink-0 text-primary" /> : <Circle className="size-5 shrink-0 text-secondary" />}
                  <div className="min-w-0"><p className="text-sm font-medium text-on-surface">{stage}</p><p className="mt-0.5 text-xs text-secondary">{ru ? `Этап ${index + 1}` : `Step ${index + 1}`}</p></div>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-3xl border border-outline-variant bg-surface-container-low p-5 sm:p-6">
            <p className="label-caps text-secondary">{ru ? "Состояние" : "Status"}</p>
            <div className="mt-4 rounded-2xl border border-dashed border-outline-variant bg-surface p-5 text-sm leading-6 text-on-surface-variant">
              <p className="font-medium text-on-surface">{ru ? "Нет активного запуска" : "No active run"}</p>
              <p className="mt-2">{ru ? "В beta.1 опубликованы протокол, границы и рабочая поверхность. Live timeline будет подключаться к сложным запросам поэтапно." : "beta.1 publishes the protocol, boundaries, and workspace surface. Live timeline wiring will roll out to complex requests incrementally."}</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
