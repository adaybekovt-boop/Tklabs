"use client";

import { CalendarDays, ChevronDown, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/latest-release";
import { cn } from "@/lib/utils";

function releaseId(version: string) {
  return `release-${version.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function PatchNotesBrowser({ entries, locale }: { entries: PublicReleaseNote[]; locale: Locale }) {
  const [query, setQuery] = useState("");
  const [openVersion, setOpenVersion] = useState(entries[0]?.version ?? "");
  const labels = locale === "ru"
    ? {
        search: "Поиск по версиям и изменениям",
        latest: "Последний релиз",
        versions: "Версии",
        changes: "изменений",
        show: "Показать подробности",
        hide: "Скрыть подробности",
        empty: "По этому запросу обновлений не найдено.",
      }
    : {
        search: "Search versions and changes",
        latest: "Latest release",
        versions: "Versions",
        changes: "changes",
        show: "Show details",
        hide: "Hide details",
        empty: "No releases match this search.",
      };

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    if (!normalized) return entries;
    return entries.filter((entry) => [entry.version, entry.date, entry.title, entry.summary, ...entry.changes]
      .join(" ")
      .toLocaleLowerCase(locale)
      .includes(normalized));
  }, [entries, locale, query]);

  function selectVersion(version: string) {
    setOpenVersion(version);
    requestAnimationFrame(() => {
      document.getElementById(releaseId(version))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-5 lg:sticky lg:top-28">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={17} aria-hidden="true" />
          <span className="sr-only">{labels.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.search}
            className="min-h-12 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest py-3 pl-11 pr-4 text-sm text-primary outline-none transition-colors placeholder:text-secondary focus:border-primary"
          />
        </label>

        <nav className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-2" aria-label={labels.versions}>
          <p className="label-caps px-3 py-2 text-secondary">{labels.versions}</p>
          <div className="max-h-[420px] space-y-1 overflow-y-auto">
            {filteredEntries.map((entry, index) => (
              <button
                key={entry.version}
                type="button"
                onClick={() => selectVersion(entry.version)}
                aria-current={openVersion === entry.version ? "true" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-surface-container-low",
                  openVersion === entry.version && "bg-surface-container-low text-primary",
                )}
              >
                <span className="truncate">{entry.version}</span>
                {index === 0 && query.length === 0 ? <Sparkles size={14} aria-label={labels.latest} /> : null}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <section className="space-y-4" aria-live="polite">
        {filteredEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center text-on-surface-variant">
            {labels.empty}
          </div>
        ) : filteredEntries.map((entry, index) => {
          const open = openVersion === entry.version;
          const contentId = `${releaseId(entry.version)}-content`;
          return (
            <article
              id={releaseId(entry.version)}
              key={entry.version}
              className={cn(
                "scroll-mt-28 overflow-hidden rounded-3xl border bg-surface-container-lowest transition-[border-color,box-shadow]",
                index === 0 && query.length === 0
                  ? "border-primary shadow-[0_20px_60px_color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
                  : "border-outline-variant",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenVersion((current) => current === entry.version ? "" : entry.version)}
                aria-expanded={open}
                aria-controls={contentId}
                className="flex w-full items-start justify-between gap-5 p-6 text-left sm:p-8"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-2xl text-primary sm:text-[30px]">{entry.version}</span>
                    {index === 0 && query.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-primary">
                        <Sparkles size={12} /> {labels.latest}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-3 block font-serif text-xl leading-[1.25] sm:text-2xl">{entry.title}</span>
                  <span className="mt-3 flex items-center gap-2 text-xs text-secondary">
                    <CalendarDays size={14} aria-hidden="true" /> {entry.date} · {entry.changes.length} {labels.changes}
                  </span>
                </span>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant text-primary">
                  <ChevronDown className={cn("transition-transform", open && "rotate-180")} size={18} aria-hidden="true" />
                  <span className="sr-only">{open ? labels.hide : labels.show}</span>
                </span>
              </button>

              {open ? (
                <div id={contentId} className="border-t border-outline-variant px-6 pb-7 pt-6 sm:px-8 sm:pb-9">
                  <p className="max-w-3xl text-[15px] leading-[1.75] text-on-surface-variant sm:text-base">{entry.summary}</p>
                  <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                    {entry.changes.map((change, changeIndex) => (
                      <li key={change} className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-[1.65] text-on-surface-variant">
                        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">{String(changeIndex + 1).padStart(2, "0")}</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
