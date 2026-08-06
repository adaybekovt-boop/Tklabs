"use client";

import { ArrowLeft, ArrowRight, CalendarDays, Check, Link2, Search, Share2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/latest-release";
import { cn } from "@/lib/utils";

function releaseId(version: string) {
  return `release-${version.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function MobileReleaseBrowser({ entries, locale }: { entries: PublicReleaseNote[]; locale: Locale }) {
  const [query, setQuery] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(entries[0]?.version ?? "");
  const [notice, setNotice] = useState("");
  const labels = locale === "ru"
    ? {
        search: "Поиск по обновлениям",
        latest: "Последний релиз",
        changes: "изменений",
        previous: "Предыдущий",
        next: "Следующий",
        share: "Поделиться",
        copy: "Скопировать ссылку",
        copied: "Ссылка скопирована",
        shared: "Системное меню отправки открыто",
        empty: "По этому запросу релизов не найдено.",
      }
    : {
        search: "Search releases",
        latest: "Latest release",
        changes: "changes",
        previous: "Previous",
        next: "Next",
        share: "Share",
        copy: "Copy link",
        copied: "Link copied",
        shared: "System share sheet opened",
        empty: "No releases match this search.",
      };

  useEffect(() => {
    function readHash() {
      const hash = window.location.hash.replace(/^#/, "");
      const selected = entries.find((entry) => releaseId(entry.version) === hash);
      if (selected) setSelectedVersion(selected.version);
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    if (!normalized) return entries;
    return entries.filter((entry) => [entry.version, entry.date, entry.title, entry.summary, ...entry.changes]
      .join(" ")
      .toLocaleLowerCase(locale)
      .includes(normalized));
  }, [entries, locale, query]);

  const selectedIndex = Math.max(0, filteredEntries.findIndex((entry) => entry.version === selectedVersion));
  const selectedEntry = filteredEntries[selectedIndex] ?? filteredEntries[0];

  function selectVersion(version: string) {
    setSelectedVersion(version);
    window.history.replaceState(window.history.state, "", `#${releaseId(version)}`);
    window.scrollTo({
      top: document.getElementById("mobile-release-browser")?.offsetTop ?? 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? "" : current), 1_800);
  }

  async function shareRelease(entry: PublicReleaseNote) {
    const url = `${window.location.origin}${window.location.pathname}#${releaseId(entry.version)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${entry.version} — ${entry.title}`, text: entry.summary, url });
        showNotice(labels.shared);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showNotice(labels.copied);
    } catch {
      // Clipboard can be unavailable in restricted browser contexts.
    }
  }

  return (
    <div id="mobile-release-browser" className="scroll-mt-24 lg:hidden" data-mobile-release-browser>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-5 border-y border-outline-variant bg-surface/95 px-5 py-3 backdrop-blur-md">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={16} aria-hidden="true" />
          <span className="sr-only">{labels.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.search}
            className="min-h-11 w-full rounded-2xl border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 text-sm text-primary outline-none placeholder:text-secondary focus:border-primary"
          />
        </label>
        <div className="-mx-5 mt-3 overflow-x-auto px-5 pb-1" aria-label={labels.search}>
          <div className="flex w-max gap-2">
            {filteredEntries.map((entry, index) => (
              <button
                key={entry.version}
                type="button"
                onClick={() => selectVersion(entry.version)}
                aria-current={selectedEntry?.version === entry.version ? "true" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-medium",
                  selectedEntry?.version === entry.version
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container-lowest text-primary",
                )}
              >
                {index === 0 && query.length === 0 ? <Sparkles size={12} aria-label={labels.latest} /> : null}
                {entry.version}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedEntry ? (
        <article id={releaseId(selectedEntry.version)} className="mt-5 overflow-hidden rounded-3xl border border-primary bg-surface-container-lowest">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-[28px] leading-none text-primary">{selectedEntry.version}</span>
                  {selectedEntry.version === entries[0]?.version ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-on-primary">
                      <Sparkles size={10} aria-hidden="true" /> {labels.latest}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-4 font-serif text-[24px] leading-[1.2] text-primary">{selectedEntry.title}</h2>
                <p className="mt-3 flex items-center gap-2 text-xs text-secondary">
                  <CalendarDays size={14} aria-hidden="true" /> {selectedEntry.date} · {selectedEntry.changes.length} {labels.changes}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void shareRelease(selectedEntry)}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant text-primary"
                aria-label={navigator.share ? labels.share : labels.copy}
              >
                {notice === labels.copied ? <Check size={17} aria-hidden="true" /> : navigator.share ? <Share2 size={17} aria-hidden="true" /> : <Link2 size={17} aria-hidden="true" />}
              </button>
            </div>

            <p className="mt-5 text-[15px] leading-[1.7] text-on-surface-variant">{selectedEntry.summary}</p>
            <ol className="mt-6 space-y-3">
              {selectedEntry.changes.map((change, index) => (
                <li key={change} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-[1.6] text-on-surface-variant">
                  <span className="text-[10px] font-semibold tracking-[0.12em] text-secondary">{String(index + 1).padStart(2, "0")}</span>
                  <span>{change}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 border-t border-outline-variant">
            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() => selectVersion(filteredEntries[selectedIndex - 1]?.version ?? selectedEntry.version)}
              className="flex min-h-14 items-center justify-center gap-2 border-r border-outline-variant px-3 text-xs font-medium text-primary disabled:opacity-35"
            >
              <ArrowLeft size={15} aria-hidden="true" /> {labels.previous}
            </button>
            <button
              type="button"
              disabled={selectedIndex >= filteredEntries.length - 1}
              onClick={() => selectVersion(filteredEntries[selectedIndex + 1]?.version ?? selectedEntry.version)}
              className="flex min-h-14 items-center justify-center gap-2 px-3 text-xs font-medium text-primary disabled:opacity-35"
            >
              {labels.next} <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </article>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">
          {labels.empty}
        </div>
      )}
      <p className="min-h-6 pt-3 text-center text-xs text-secondary" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}
