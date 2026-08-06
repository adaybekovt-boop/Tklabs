"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  LoaderCircle,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  WandSparkles,
  XCircle,
} from "lucide-react";

import { MarkdownMessage } from "@/components/playground/MarkdownMessage";
import { createArtifact, loadArtifacts, saveArtifacts, updateArtifact } from "@/lib/artifacts/local-store";
import type { ArtifactKind } from "@/lib/artifacts/types";
import {
  createFlowRun,
  loadFlowRuns,
  replaceFlowRun,
  saveFlowRuns,
  updateFlowRun,
  updateFlowStep,
  type FlowRun,
  type FlowStepStatus,
} from "@/lib/flow/local-store";
import type { Locale } from "@/lib/i18n";
import { AUTO_ERMA_MODEL_KEY } from "@/lib/models/public";
import { requestWorkspaceSection } from "@/lib/workspace-events";
import { cn } from "@/lib/utils";

type StreamEvent = "start" | "tool" | "delta" | "meta" | "error" | "done";
type StreamPayload = Record<string, unknown>;

const MAX_PROMPT_LENGTH = 2_000;

function parseFrame(frame: string): { event: StreamEvent; payload: StreamPayload } | null {
  const lines = frame.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const dataLine = lines.find((line) => line.startsWith("data:"));
  const event = eventLine?.slice(6).trim();
  if (!event || !["start", "tool", "delta", "meta", "error", "done"].includes(event)) return null;
  try {
    const payload = JSON.parse(dataLine?.slice(5).trim() || "{}") as StreamPayload;
    return { event: event as StreamEvent, payload };
  } catch {
    return null;
  }
}

function detectArtifactKind(content: string): ArtifactKind {
  const trimmed = content.trim();
  if (/^```|\n```/.test(trimmed)) return "code";
  if (/^[\[{]/.test(trimmed) && /[\]}]$/.test(trimmed)) return "json";
  if (/\n\s*\|.+\|\s*\n\s*\|[-:| ]+\|/.test(trimmed)) return "table";
  if (/^(?:#|\d+\.|[-*])\s/m.test(trimmed)) return "plan";
  return "document";
}

function statusLabel(status: FlowRun["status"], ru: boolean) {
  if (status === "planning") return ru ? "Подготовка" : "Preparing";
  if (status === "running") return ru ? "Выполняется" : "Running";
  if (status === "completed") return ru ? "Завершено" : "Completed";
  if (status === "stopped") return ru ? "Остановлено" : "Stopped";
  return ru ? "Ошибка" : "Failed";
}

function StepIcon({ status }: { status: FlowStepStatus }) {
  if (status === "completed") return <CheckCircle2 className="size-5" />;
  if (status === "running") return <LoaderCircle className="size-5 animate-spin" />;
  if (status === "failed") return <XCircle className="size-5" />;
  if (status === "stopped") return <Square className="size-4" />;
  return <Circle className="size-5" />;
}

export function ErmaFlowStudio({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const copy = useMemo(() => ({
    title: ru ? "Erma Flow" : "Erma Flow",
    eyebrow: ru ? "НОВАЯ РАБОЧАЯ СРЕДА" : "NEW WORKSPACE",
    description: ru
      ? "Запускайте сложную задачу как управляемый поток: подготовка, инструменты, генерация, результат и артефакт — без публикации скрытых рассуждений модели."
      : "Run a complex task as a controlled flow: preparation, tools, generation, result, and artifact — without exposing hidden model reasoning.",
    placeholder: ru
      ? "Например: проанализируй мобильный интерфейс, составь план исправлений и подготовь итоговый документ…"
      : "For example: analyze the mobile interface, create an improvement plan, and prepare a final document…",
    run: ru ? "Запустить Flow" : "Run Flow",
    stop: ru ? "Остановить" : "Stop",
    result: ru ? "Результат" : "Result",
    history: ru ? "История запусков" : "Run history",
    emptyHistory: ru ? "Запуски появятся здесь после первой задачи." : "Runs will appear here after the first task.",
    saveArtifact: ru ? "Сохранить как артефакт" : "Save as artifact",
    artifactSaved: ru ? "Артефакт создан" : "Artifact created",
    retry: ru ? "Повторить" : "Run again",
    local: ru ? "История хранится на этом устройстве" : "History stays on this device",
    hiddenReasoning: ru ? "Показываются только этапы и полезный прогресс" : "Only stages and useful progress are shown",
    limit: ru ? "Лимит запроса" : "Prompt limit",
    genericError: ru ? "Не удалось завершить Flow." : "Flow could not be completed.",
    stopped: ru ? "Flow остановлен. Частичный результат сохранён." : "Flow stopped. The partial result was preserved.",
    noResult: ru ? "Результат ещё не сформирован." : "No result has been generated yet.",
    templates: ru
      ? [
          "Проанализируй текущий интерфейс и подготовь приоритетный план улучшений.",
          "Составь качественную техническую спецификацию новой функции.",
          "Проведи аудит продукта и подготовь итоговый документ с решениями.",
        ]
      : [
          "Analyze the current interface and prepare a prioritized improvement plan.",
          "Create a high-quality technical specification for a new feature.",
          "Audit the product and prepare a final document with recommended decisions.",
        ],
    steps: ru
      ? ["Подготовка задачи", "Контекст и инструменты", "Создание результата", "Финализация"]
      : ["Prepare task", "Context and tools", "Create result", "Finalize"],
  }), [ru]);

  const [prompt, setPrompt] = useState("");
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const runsRef = useRef<FlowRun[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loaded = loadFlowRuns();
    runsRef.current = loaded;
    setRuns(loaded);
    setSelectedId(loaded[0]?.id ?? "");
    return () => controllerRef.current?.abort("workspace_unmounted");
  }, []);

  const selected = runs.find((run) => run.id === selectedId) ?? runs[0] ?? null;
  const active = runs.find((run) => run.id === activeIdRef.current && (run.status === "planning" || run.status === "running")) ?? null;
  const completedSteps = selected?.steps.filter((step) => step.status === "completed").length ?? 0;

  function displayRun(run: FlowRun, persist = false) {
    setRuns((current) => {
      const next = replaceFlowRun(current, run);
      runsRef.current = next;
      if (persist) saveFlowRuns(next);
      return next;
    });
    setSelectedId(run.id);
  }

  function persistRun(run: FlowRun) {
    displayRun(run, true);
  }

  async function startRun(sourcePrompt = prompt) {
    const cleanPrompt = sourcePrompt.trim();
    if (!cleanPrompt || cleanPrompt.length > MAX_PROMPT_LENGTH || active) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    let run = createFlowRun(cleanPrompt, locale, copy.steps);
    activeIdRef.current = run.id;
    setPrompt(cleanPrompt);
    persistRun(run);

    const commit = (update: Parameters<typeof updateFlowRun>[1], persist = true) => {
      run = updateFlowRun(run, update);
      displayRun(run, persist);
    };
    const step = (index: number, status: FlowStepStatus, detail?: string, persist = true) => {
      run = updateFlowStep(run, index, { status, ...(detail ? { detail } : {}) });
      displayRun(run, persist);
    };

    try {
      step(0, "completed", ru ? "Запрос проверен и подготовлен" : "Request validated and prepared");
      step(1, "running", ru ? "Подключение к Erma" : "Connecting to Erma");
      commit({ status: "running" });

      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream, application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: cleanPrompt,
          messages: [],
          model: AUTO_ERMA_MODEL_KEY,
          locale,
          reasonEnabled: true,
          effort: "high",
          tone: "professional",
          attachments: [],
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: unknown; requestId?: unknown } | null;
        const error = typeof payload?.error === "string" ? payload.error : `${copy.genericError} (${response.status})`;
        step(1, "failed", error);
        commit({ status: "failed", error, ...(typeof payload?.requestId === "string" ? { requestId: payload.requestId } : {}) });
        return;
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/event-stream")) {
        const payload = await response.json().catch(() => null) as { answer?: unknown; meta?: { requestId?: unknown; actualModel?: unknown } } | null;
        const result = typeof payload?.answer === "string" ? payload.answer.trim() : "";
        if (!result) throw new Error(copy.genericError);
        step(1, "completed", ru ? "Контекст подготовлен" : "Context prepared", false);
        step(2, "completed", ru ? "Ответ сформирован" : "Result generated", false);
        step(3, "completed", ru ? "Результат готов" : "Result ready", false);
        commit({
          status: "completed",
          result,
          ...(typeof payload?.meta?.requestId === "string" ? { requestId: payload.meta.requestId } : {}),
          ...(typeof payload?.meta?.actualModel === "string" ? { actualModel: payload.meta.actualModel } : {}),
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error(copy.genericError);
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";
      let streamError = "";
      let firstDelta = true;
      let lastPaintAt = 0;

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const frame = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          const parsed = parseFrame(frame);
          if (!parsed) continue;

          if (parsed.event === "start") {
            const context = parsed.payload.context;
            const detail = context && typeof context === "object" && "estimatedTokens" in context
              ? `${ru ? "Контекст" : "Context"}: ${String((context as { estimatedTokens?: unknown }).estimatedTokens ?? "—")} tokens`
              : ru ? "Контекст подготовлен" : "Context prepared";
            step(1, "running", detail, false);
          }

          if (parsed.event === "tool") {
            const tool = typeof parsed.payload.tool === "string" ? parsed.payload.tool : ru ? "Инструмент подключён" : "Tool connected";
            step(1, "running", tool, false);
          }

          if (parsed.event === "delta") {
            const delta = typeof parsed.payload.text === "string" ? parsed.payload.text : "";
            if (!delta) continue;
            result += delta;
            if (firstDelta) {
              firstDelta = false;
              step(1, "completed", ru ? "Контекст и инструменты готовы" : "Context and tools ready", false);
              step(2, "running", ru ? "Erma формирует результат" : "Erma is creating the result", false);
            }
            const now = Date.now();
            run = updateFlowRun(run, { result });
            if (now - lastPaintAt > 70) {
              displayRun(run, false);
              lastPaintAt = now;
            }
          }

          if (parsed.event === "meta") {
            step(2, "completed", ru ? "Результат сформирован" : "Result generated", false);
            step(3, "running", ru ? "Проверка и сохранение" : "Checking and saving", false);
            commit({
              result,
              ...(typeof parsed.payload.requestId === "string" ? { requestId: parsed.payload.requestId } : {}),
              ...(typeof parsed.payload.actualModel === "string" ? { actualModel: parsed.payload.actualModel } : {}),
            }, false);
          }

          if (parsed.event === "error") {
            streamError = typeof parsed.payload.error === "string" ? parsed.payload.error : copy.genericError;
          }

          if (parsed.event === "done") {
            const stopped = parsed.payload.stopped === true;
            if (stopped) {
              const runningIndex = run.steps.findIndex((entry) => entry.status === "running");
              if (runningIndex >= 0) step(runningIndex, "stopped", copy.stopped, false);
              commit({ status: "stopped", result, error: copy.stopped });
            } else if (result.trim()) {
              step(2, "completed", ru ? "Результат сформирован" : "Result generated", false);
              step(3, "completed", ru ? "Flow завершён" : "Flow completed", false);
              commit({ status: "completed", result, ...(streamError ? { error: streamError } : {}) });
            } else {
              step(2, "failed", streamError || copy.genericError, false);
              commit({ status: "failed", error: streamError || copy.genericError });
            }
          }
        }
        if (done) break;
      }

      if (run.status === "running" || run.status === "planning") {
        if (!result.trim()) throw new Error(streamError || copy.genericError);
        step(2, "completed", ru ? "Результат сформирован" : "Result generated", false);
        step(3, "completed", ru ? "Flow завершён" : "Flow completed", false);
        commit({ status: "completed", result, ...(streamError ? { error: streamError } : {}) });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        const runningIndex = run.steps.findIndex((entry) => entry.status === "running");
        if (runningIndex >= 0) run = updateFlowStep(run, runningIndex, { status: "stopped", detail: copy.stopped });
        run = updateFlowRun(run, { status: "stopped", error: copy.stopped });
        persistRun(run);
      } else {
        const message = error instanceof Error && error.message ? error.message : copy.genericError;
        const runningIndex = run.steps.findIndex((entry) => entry.status === "running");
        if (runningIndex >= 0) run = updateFlowStep(run, runningIndex, { status: "failed", detail: message });
        run = updateFlowRun(run, { status: "failed", error: message });
        persistRun(run);
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (activeIdRef.current === run.id) activeIdRef.current = null;
    }
  }

  function stopRun() {
    controllerRef.current?.abort("user_stopped");
  }

  function saveAsArtifact(run: FlowRun) {
    if (!run.result?.trim()) return;
    const artifact = updateArtifact(createArtifact(detectArtifactKind(run.result), run.title), { content: run.result });
    saveArtifacts([artifact, ...loadArtifacts()].slice(0, 24));
    const nextRun = updateFlowRun(run, { artifactId: artifact.id });
    persistRun(nextRun);
    window.dispatchEvent(new CustomEvent("tklabs:artifact-created", { detail: artifact.id }));
    requestWorkspaceSection("artifacts");
  }

  return (
    <section className="h-full overflow-y-auto bg-surface p-3 sm:p-6 lg:p-8" data-erma-flow-studio data-motion-section>
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <header className="flow-hero rounded-[2rem] border border-outline-variant bg-surface-container-low p-5 sm:p-8" data-motion-card>
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">
                <WandSparkles className="size-4" />{copy.eyebrow}
              </div>
              <h1 className="mt-5 font-serif text-4xl leading-tight text-on-surface sm:text-6xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-on-surface-variant sm:text-base">{copy.description}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-on-secondary-container">
                <span className="rounded-full border border-outline-variant bg-surface px-3 py-1.5">{copy.hiddenReasoning}</span>
                <span className="rounded-full border border-outline-variant bg-surface px-3 py-1.5">{copy.local}</span>
              </div>
            </div>
          </header>

          <div className="rounded-[1.75rem] border border-outline-variant bg-surface-container-lowest p-3 shadow-sm sm:p-5" data-motion-card>
            <label className="block">
              <span className="sr-only">{copy.placeholder}</span>
              <textarea
                value={prompt}
                onChange={(event: { target: { value: string } }) => setPrompt(event.target.value.slice(0, MAX_PROMPT_LENGTH))}
                placeholder={copy.placeholder}
                rows={5}
                disabled={Boolean(active)}
                className="min-h-36 w-full resize-y rounded-2xl border border-outline-variant bg-surface px-4 py-4 text-[16px] leading-7 text-on-surface outline-none focus:border-primary disabled:opacity-60 sm:min-h-40 sm:px-5"
              />
            </label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {copy.templates.map((template) => (
                <button
                  key={template}
                  type="button"
                  disabled={Boolean(active)}
                  onClick={() => setPrompt(template)}
                  className="shrink-0 rounded-full border border-outline-variant bg-surface px-3 py-2 text-left text-[11px] text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  {template.slice(0, 54)}{template.length > 54 ? "…" : ""}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={cn("text-xs", prompt.length > MAX_PROMPT_LENGTH * .9 ? "text-error" : "text-on-secondary-container")}>
                {copy.limit}: {prompt.length}/{MAX_PROMPT_LENGTH}
              </p>
              {active ? (
                <button type="button" onClick={stopRun} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-error/45 bg-error/10 px-5 text-sm font-medium text-error">
                  <Square className="size-4" fill="currentColor" />{copy.stop}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!prompt.trim() || prompt.length > MAX_PROMPT_LENGTH}
                  onClick={() => void startRun()}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-on-primary shadow-sm disabled:opacity-30"
                >
                  <Play className="size-4" fill="currentColor" />{copy.run}<ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </div>

          {selected ? (
            <article className="flow-run-card rounded-[1.75rem] border border-outline-variant bg-surface-container-lowest p-4 sm:p-6" data-active={selected.status === "planning" || selected.status === "running"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">
                    <Activity className="size-4" />Flow run
                  </div>
                  <h2 className="mt-2 line-clamp-2 text-xl font-medium text-on-surface sm:text-2xl">{selected.title}</h2>
                  <p className="mt-2 text-xs text-on-secondary-container">
                    {new Date(selected.createdAt).toLocaleString(ru ? "ru-RU" : "en-US")}
                    {selected.actualModel ? ` · ${selected.actualModel}` : ""}
                  </p>
                </div>
                <span className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  selected.status === "completed" && "border-primary/30 bg-primary/10 text-primary",
                  (selected.status === "planning" || selected.status === "running") && "border-chat-accent bg-chat-accent-soft text-primary",
                  selected.status === "failed" && "border-error/40 bg-error/10 text-error",
                  selected.status === "stopped" && "border-outline-variant bg-surface-container-low text-on-surface-variant",
                )}>{statusLabel(selected.status, ru)}</span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {selected.steps.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flow-step flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface px-3 py-3.5"
                    data-state={entry.status}
                    style={{ "--flow-step-index": index } as CSSProperties}
                  >
                    <span className={cn(
                      "flow-step-icon mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                      entry.status === "completed" && "bg-primary text-on-primary",
                      entry.status === "running" && "bg-chat-accent-soft text-primary",
                      entry.status === "failed" && "bg-error/10 text-error",
                      (entry.status === "pending" || entry.status === "stopped") && "bg-surface-container-low text-on-secondary-container",
                    )}><StepIcon status={entry.status} /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface">{entry.title}</p>
                      {entry.detail ? <p className="mt-1 text-xs leading-5 text-on-secondary-container">{entry.detail}</p> : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.round((completedSteps / Math.max(1, selected.steps.length)) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs text-on-secondary-container">{completedSteps}/{selected.steps.length}</span>
              </div>

              {selected.error ? (
                <p className={cn("mt-4 rounded-2xl px-4 py-3 text-sm leading-6", selected.status === "failed" ? "bg-error/10 text-error" : "bg-surface-container-low text-on-surface-variant")}>{selected.error}</p>
              ) : null}

              {selected.result ? (
                <div className="flow-result-enter mt-5 border-t border-outline-variant pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.1em] text-secondary"><Sparkles className="size-4" />{copy.result}</h3>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void startRun(selected.prompt)} disabled={Boolean(active)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-outline-variant px-4 text-xs font-medium disabled:opacity-40"><RotateCcw className="size-4" />{copy.retry}</button>
                      <button type="button" onClick={() => saveAsArtifact(selected)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs font-medium text-on-primary">
                        {selected.artifactId ? <Check className="size-4" /> : <FileText className="size-4" />}
                        {selected.artifactId ? copy.artifactSaved : copy.saveArtifact}
                      </button>
                    </div>
                  </div>
                  <div className={cn("chat-markdown mt-4 rounded-2xl border border-outline-variant bg-surface p-4 text-[15px] leading-7 sm:p-5", (selected.status === "running" || selected.status === "planning") && "flow-streaming-caret")}>
                    <MarkdownMessage content={selected.result} />
                  </div>
                </div>
              ) : selected.status === "completed" ? <p className="mt-4 text-sm text-on-surface-variant">{copy.noResult}</p> : null}
            </article>
          ) : null}
        </div>

        <aside className="min-w-0 rounded-[1.75rem] border border-outline-variant bg-surface-container-low/70 p-4 xl:sticky xl:top-4 xl:h-[calc(100dvh-7rem)] xl:overflow-hidden" data-motion-card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="label-caps text-secondary">{copy.history}</p>
              <p className="mt-1 text-xs text-on-secondary-container">{copy.local}</p>
            </div>
            <Clock3 className="size-5 text-secondary" />
          </div>
          <div className="mt-4 max-h-[44vh] space-y-2 overflow-y-auto pr-1 xl:max-h-[calc(100dvh-12rem)]">
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
                <span className="line-clamp-2 text-sm font-medium leading-5 text-on-surface">{run.title}</span>
                <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-on-secondary-container">
                  <span>{statusLabel(run.status, ru)}</span>
                  <span>{new Date(run.updatedAt).toLocaleTimeString(ru ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </span>
              </button>
            ))}
            {!runs.length ? <p className="rounded-2xl border border-dashed border-outline-variant bg-surface p-4 text-sm leading-6 text-on-surface-variant">{copy.emptyHistory}</p> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
