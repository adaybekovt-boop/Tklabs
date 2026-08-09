"use client";

import { ExternalLink, Search } from "lucide-react";

import type { AiGroundingMeta } from "@/lib/ai/types";

export function GoogleGroundingPanel({ grounding, locale }: { grounding?: AiGroundingMeta; locale: "ru" | "en" }) {
  if (!grounding || grounding.provider !== "google-search" || grounding.directPassThrough !== true) return null;
  const citations = grounding.citations.filter((citation, index, entries) => entries.findIndex((entry) => entry.url === citation.url) === index);
  const label = locale === "ru" ? "Ответ Google Search" : "Google Search answer";
  const sourcesLabel = locale === "ru" ? "Источники Google" : "Google sources";
  const suggestionsTitle = locale === "ru" ? "Подсказки Google Search" : "Google Search suggestions";

  return (
    <section className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-low p-3" data-google-grounding>
      <div className="flex items-center gap-2 text-[11px] font-medium text-on-secondary-container">
        <Search size={13} aria-hidden="true" />
        <span>{label}</span>
      </div>

      {grounding.searchSuggestionsHtml ? (
        <iframe
          title={suggestionsTitle}
          srcDoc={grounding.searchSuggestionsHtml}
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          referrerPolicy="no-referrer"
          className="mt-2 h-20 w-full rounded-xl border-0 bg-transparent"
        />
      ) : null}

      {citations.length ? (
        <div className="mt-3 border-t border-outline-variant/60 pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-on-secondary-container">{sourcesLabel}</p>
          <div className="flex flex-wrap gap-2">
            {citations.map((citation) => (
              <a
                key={citation.url}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-[11px] text-on-secondary-container hover:text-primary"
              >
                <span className="max-w-48 truncate">{citation.title}</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
