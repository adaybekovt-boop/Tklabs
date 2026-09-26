"use client";

import { useEffect, useState } from "react";
import { MarkdownMessage } from "./MarkdownMessage";
import { useWorkspaceRuns } from "@/hooks/use-workspace-runs";
import { getSession } from "@/lib/local-archive";
import type { Locale } from "@/lib/i18n";
import { requestWorkspaceSection } from "@/lib/workspace-events";
import { FLOW_RUNS_UPDATED_EVENT, loadFlowRuns, type FlowRun } from "@/lib/flow/local-store";

export function AgentRunPanel({ locale, runId }: { locale: Locale; runId?: string }) {
  const runs = useWorkspaceRuns();
  const [legacy, setLegacy] = useState<FlowRun[]>([]);
  useEffect(() => {
    const refresh = () => setLegacy(loadFlowRuns());
    refresh();
    window.addEventListener(FLOW_RUNS_UPDATED_EVENT, refresh);
    window.addEventListener("tklabs:workspace-data-replaced", refresh);
    return () => { window.removeEventListener(FLOW_RUNS_UPDATED_EVENT, refresh); window.removeEventListener("tklabs:workspace-data-replaced", refresh); };
  }, []);
  const [selectedId, setSelectedId] = useState("");
  const effectiveId = selectedId || runId;
  const selected = runs.find((run) => run.id === effectiveId) ?? runs[0];
  const selectedLegacy = legacy.find((run) => `legacy:${run.id}` === (effectiveId || (!runs.length ? `legacy:${legacy[0]?.id}` : "")));
  const ru = locale === "ru";
  const answer = selected && getSession(selected.sessionId)?.messages.find((message) => message.id === selected.assistantMessageId);
  return <section className="workspace-activity" data-agent-run-panel>
    <div className="workspace-activity-count">{ru ? "История задач" : "Task history"} <span>{runs.length + legacy.length}</span></div>
    {runs.length || legacy.length ? <select aria-label={ru ? "Выбрать запуск" : "Select run"} value={selectedLegacy ? `legacy:${selectedLegacy.id}` : selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{runs.map((run) => <option key={run.id} value={run.id}>{run.title}</option>)}{legacy.map((run) => <option key={run.id} value={`legacy:${run.id}`}>{run.title} · {ru ? "ранее" : "earlier"}</option>)}</select> : <p>{ru ? "Задач пока нет." : "No tasks yet."}</p>}
    {selectedLegacy && <div className="workspace-activity-detail"><h3>{selectedLegacy.title}</h3><p>{selectedLegacy.status}</p>{selectedLegacy.steps.map((step) => <div key={step.id} className="workspace-tool-row">{step.title} · {step.status}</div>)}{selectedLegacy.error && <p role="alert">{selectedLegacy.error}</p>}{selectedLegacy.result && <div className="workspace-artifact-preview"><MarkdownMessage content={selectedLegacy.result} /></div>}{selectedLegacy.artifactId && <button type="button" onClick={() => requestWorkspaceSection("artifacts")}>{ru ? "Открыть файл" : "Open file"}</button>}</div>}
    {selected && !selectedLegacy && <div className="workspace-activity-detail">
      <h3>{selected.title}</h3><p role="status">{({ understanding: ru ? "Подключение" : "Connecting", planning: ru ? "План" : "Planning", executing: ru ? "Выполняется" : "Running", reviewing: ru ? "Проверка" : "Reviewing", completed: ru ? "Готово" : "Completed", failed: ru ? "Ошибка" : "Failed", cancelled: ru ? "Остановлено" : "Stopped", paused: ru ? "Прервано" : "Interrupted" })[selected.status]}</p>
      {selected.error && <p role="alert">{selected.error}</p>}
      {selected.steps.map((step) => <div key={step.id} className="workspace-tool-row">{step.title} · {step.status}</div>)}
      {selected.toolCalls.map((tool) => <details key={tool.id}><summary>{tool.name} · {tool.status}</summary><p>{tool.summary}</p>{tool.links?.filter((link) => /^https:\/\/|^\/(?!\/)/.test(link.href)).map((link) => <a key={link.href} href={link.href} rel="noopener noreferrer" target="_blank">{link.label}</a>)}</details>)}
      {selected.sources.map((source) => <p key={source.id}>{source.href?.startsWith("https://") ? <a href={source.href} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title}</p>)}
      {selected.artifactIds.map((id) => <button key={id} type="button" onClick={() => requestWorkspaceSection("artifacts")}>{ru ? "Открыть файл" : "Open file"}</button>)}
      {answer?.content && <details><summary>{ru ? "Результат" : "Result"}</summary><MarkdownMessage content={answer.content} /></details>}
    </div>}
  </section>;
}
