import { AlertTriangle, Calculator, CheckCircle2, CircleSlash2, Clock3, ExternalLink, FileCode2, FileSearch, Gauge, Globe2, LibraryBig, Search, ShieldCheck, Sigma, Wrench } from "lucide-react";

import type { AiToolCallTrace, AiToolName } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function ToolIcon({ name }: { name: AiToolName }) {
  if (name === "calculate" || name === "solve_math") return name === "solve_math" ? <Sigma size={15} /> : <Calculator size={15} />;
  if (name === "search_patch_notes") return <LibraryBig size={15} />;
  if (name === "search_tklab_knowledge") return <ShieldCheck size={15} />;
  if (name === "search_web" || name === "open_web_result") return <Globe2 size={15} />;
  if (name === "search_documentation" || name === "search_documents") return <FileSearch size={15} />;
  if (name === "run_code_sandbox") return <FileCode2 size={15} />;
  if (name === "search_local_archive") return <Search size={15} />;
  if (name === "get_service_status") return <Gauge size={15} />;
  return <Wrench size={15} />;
}

function StatusIcon({ status }: { status: AiToolCallTrace["status"] }) {
  if (status === "success") return <CheckCircle2 size={14} />;
  if (status === "timeout") return <Clock3 size={14} />;
  if (status === "blocked") return <CircleSlash2 size={14} />;
  return <AlertTriangle size={14} />;
}

function toolLabel(name: AiToolName, locale: Locale) {
  const labels: Record<AiToolName, { ru: string; en: string }> = {
    search_documentation: { ru: "Поиск по документации", en: "Documentation search" },
    search_patch_notes: { ru: "Поиск по обновлениям", en: "Patch Notes search" },
    search_tklab_knowledge: { ru: "Знания TK LAB", en: "TK LAB knowledge" },
    search_documents: { ru: "Поиск по прикреплённым файлам", en: "Attached document search" },
    get_service_status: { ru: "Статус сервисов", en: "Service status" },
    calculate: { ru: "Вычисление", en: "Calculation" },
    solve_math: { ru: "Проверка математики", en: "Math verification" },
    search_local_archive: { ru: "Поиск в локальном архиве", en: "Local archive search" },
    get_model_capabilities: { ru: "Возможности модели", en: "Model capabilities" },
    search_web: { ru: "Поиск в интернете", en: "Web search" },
    open_web_result: { ru: "Чтение веб-источника", en: "Read web source" },
    run_code_sandbox: { ru: "Проверка кода в sandbox", en: "Code sandbox" },
  };
  return labels[name][locale];
}

export function ToolCallCards({ calls, locale }: { calls?: AiToolCallTrace[]; locale: Locale }) {
  if (!calls?.length) return null;
  const heading = locale === "ru" ? "AI использовал инструмент" : "AI used a tool";
  return (
    <section className="mt-4 space-y-2" aria-label={heading} data-tool-call-cards>
      <p className="label-caps flex items-center gap-2 text-on-secondary-container"><Wrench size={13} />{heading}</p>
      {calls.map((call) => (
        <article key={call.id} className="rounded-2xl border border-outline-variant bg-surface-container-low px-3.5 py-3">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-primary"><ToolIcon name={call.name} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-medium text-primary">{toolLabel(call.name, locale)}</p>
                <span className={cn("inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em]", call.status === "success" ? "text-on-secondary-container" : "text-error")}><StatusIcon status={call.status} />{call.status}</span>
                <span className="text-[10px] text-on-secondary-container">{Math.max(0, Math.round(call.durationMs))}ms</span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{call.summary}</p>
              {call.links?.length ? <div className="mt-2 flex flex-wrap gap-2">{call.links.map((link) => <a key={`${call.id}-${link.href}`} href={link.href} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-outline-variant px-2.5 text-[10px] text-primary hover:bg-surface"><ExternalLink size={11} />{link.label}</a>)}</div> : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
