import { AlertTriangle, Calculator, CheckCircle2, ChevronDown, ExternalLink, FileSearch, Gauge, LibraryBig, Search, Wrench } from "lucide-react";

import type { AiToolCallTrace, AiToolName } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n";

function ToolIcon({ name }: { name: AiToolName }) {
  if (name === "calculate") return <Calculator size={14} />;
  if (name === "search_patch_notes") return <LibraryBig size={14} />;
  if (name === "search_documentation") return <FileSearch size={14} />;
  if (name === "search_local_archive") return <Search size={14} />;
  if (name === "get_service_status") return <Gauge size={14} />;
  return <Wrench size={14} />;
}

function toolLabel(name: AiToolName, locale: Locale) {
  const labels: Record<AiToolName, { ru: string; en: string }> = {
    search_documentation: { ru: "Документация", en: "Documentation" },
    search_patch_notes: { ru: "Обновления", en: "Release notes" },
    get_service_status: { ru: "Статус сервисов", en: "Service status" },
    calculate: { ru: "Вычисление", en: "Calculation" },
    search_local_archive: { ru: "Локальная история", en: "Local history" },
    get_model_capabilities: { ru: "Возможности модели", en: "Model capabilities" },
  };
  return labels[name][locale];
}

export function AgentActivity({ calls, locale, open = false }: { calls?: AiToolCallTrace[]; locale: Locale; open?: boolean }) {
  if (!calls?.length) return null;
  const failed = calls.filter((call) => call.status !== "success").length;
  const heading = locale === "ru"
    ? failed ? `Проверки: ${calls.length} · не удалось: ${failed}` : `Проверено инструментами: ${calls.length}`
    : failed ? `Checks: ${calls.length} · failed: ${failed}` : `Checked with tools: ${calls.length}`;

  return (
    <details className="group mt-4 rounded-2xl border border-outline-variant bg-surface-container-low" open={open} data-agent-activity>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-[11px] font-medium text-on-surface-variant [&::-webkit-details-marker]:hidden">
        {failed ? <AlertTriangle size={14} className="text-error" /> : <CheckCircle2 size={14} />}
        <span className="min-w-0 flex-1 truncate">{heading}</span>
        <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-outline-variant p-3">
        {calls.map((call) => (
          <article key={call.id} className="rounded-xl bg-surface px-3 py-2.5">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface-container-low text-primary"><ToolIcon name={call.name} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-medium text-primary">{toolLabel(call.name, locale)}</p>
                  {call.status !== "success" && <span className="text-[10px] font-medium text-error">{locale === "ru" ? "Не удалось" : "Unavailable"}</span>}
                </div>
                <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{call.summary}</p>
                {call.links?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {call.links.map((link) => (
                      <a key={`${call.id}-${link.href}`} href={link.href} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-outline-variant px-2.5 text-[10px] text-primary hover:bg-surface-container-low">
                        <ExternalLink size={11} />{link.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}
