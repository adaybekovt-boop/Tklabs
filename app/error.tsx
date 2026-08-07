"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ui.route_error", { digest: error.digest ?? "unknown", name: error.name });
  }, [error]);

  const russian = typeof document !== "undefined" && document.documentElement.lang.startsWith("ru");
  const text = russian
    ? {
        eyebrow: "Безопасное восстановление",
        title: "Раздел временно не загрузился.",
        description: "Рабочие данные в браузере не удалены. Повторите загрузку раздела или откройте страницу статуса, если ошибка сохраняется.",
        retry: "Повторить",
        status: "Открыть статус",
        home: "На главную",
        incident: "Код ошибки",
      }
    : {
        eyebrow: "Safe recovery",
        title: "This section did not load.",
        description: "Browser workspace data has not been removed. Retry the section or open Status if the failure continues.",
        retry: "Retry",
        status: "Open status",
        home: "Go home",
        incident: "Error reference",
      };

  return (
    <main className="stitch-container grid min-h-[70dvh] place-items-center py-16" data-runtime-error-boundary>
      <section className="w-full max-w-2xl rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_28px_90px_rgba(15,23,42,.1)] sm:p-9">
        <span className="grid size-12 place-items-center rounded-2xl border border-outline-variant bg-surface-container-low text-primary">
          <AlertTriangle size={21} aria-hidden="true" />
        </span>
        <p className="label-caps mt-7 text-secondary">{text.eyebrow}</p>
        <h1 className="mt-4 font-serif text-[40px] leading-[1.05] text-primary sm:text-[52px]">{text.title}</h1>
        <p className="mt-5 max-w-xl leading-[1.75] text-on-surface-variant">{text.description}</p>
        {error.digest ? <p className="mt-5 font-mono text-xs text-secondary">{text.incident}: {error.digest}</p> : null}
        <div className="mt-8 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="quiet-button quiet-button--dark gap-2">
            <RefreshCcw size={15} aria-hidden="true" /> {text.retry}
          </button>
          <Link href="/status" className="quiet-button">{text.status}</Link>
          <Link href="/" className="quiet-button">{text.home}</Link>
        </div>
      </section>
    </main>
  );
}
