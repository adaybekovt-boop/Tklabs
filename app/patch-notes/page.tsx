import type { Metadata } from "next";

import { MobileReleaseBrowser } from "@/components/site/MobileReleaseBrowser";
import { PatchNotesBrowser } from "@/components/site/PatchNotesBrowser";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getReleaseHistory } from "@/lib/latest-release";
import { getLocale } from "@/lib/locale";
import { getPreviewRelease } from "@/lib/prerelease";
import { getReleaseV0131 } from "@/lib/release-v0131";

export const metadata: Metadata = {
  title: "TK LAB — Patch Notes",
  description: "Release history, major previews, and product updates for TK LAB.",
};

export default async function PatchNotesPage() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const previewRelease = getPreviewRelease(locale);
  const entries = [previewRelease, ...getReleaseHistory(locale).filter((entry) => entry.version !== previewRelease.version)];
  const detailedRelease = getReleaseV0131(locale);
  const currentIndex = entries.findIndex((entry) => entry.version === detailedRelease.version);
  if (currentIndex >= 0) entries[currentIndex] = detailedRelease;
  else entries.push(detailedRelease);
  const ui = locale === "ru"
    ? {
        major: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ",
        knownIssues: "Известные ограничения preview",
        migration: "Совместимость и миграция",
        automated: "Новые release notes формируются автоматически из pull request и хранятся в GitHub Releases.",
        openAutomated: "Автоматические release notes",
      }
    : {
        major: "MAJOR UPDATE · PRE-RELEASE",
        knownIssues: "Known preview limitations",
        migration: "Compatibility and migration",
        automated: "New release notes are generated automatically from pull requests and stored in GitHub Releases.",
        openAutomated: "Automated release notes",
      };

  return (
    <>
      <StitchHeader active="patch-notes" />
      <main className="stitch-container pb-section-gap pt-6 sm:pt-10">
        <section className="mb-8 overflow-hidden rounded-3xl border border-primary/25 bg-surface-container-lowest p-6 shadow-sm sm:mb-10 sm:p-8" data-major-preview-release>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              {ui.major}
            </span>
            <span className="text-xs font-semibold text-secondary">{previewRelease.version} · {previewRelease.codename}</span>
          </div>
          <div className="mt-4">
            <h1 className="font-serif text-[28px] leading-[1.12] text-on-surface sm:text-[38px]">{previewRelease.title}</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-on-surface-variant sm:text-[15px]">{previewRelease.summary}</p>
          </div>
          <div className="mt-6 grid gap-3 border-t border-outline-variant/50 pt-5 md:grid-cols-2" data-preview-release-notices>
            <section className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4" aria-labelledby="preview-known-issues-title">
              <h2 id="preview-known-issues-title" className="label-caps text-secondary">{ui.knownIssues}</h2>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-on-surface-variant sm:text-[13px]">
                {previewRelease.knownIssues.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </section>
            <section className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4" aria-labelledby="preview-migration-title">
              <h2 id="preview-migration-title" className="label-caps text-secondary">{ui.migration}</h2>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-on-surface-variant sm:text-[13px]">
                {previewRelease.migrationNotes.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </section>
          </div>
          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-5 text-on-surface-variant sm:text-[13px]">{ui.automated}</p>
            <a
              href="https://github.com/adaybekovt-boop/Tklabs/releases"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-semibold text-primary underline decoration-outline-variant underline-offset-4 hover:decoration-primary"
            >
              {ui.openAutomated}
            </a>
          </div>
        </section>

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4" aria-labelledby="patch-notes-list-title">
          <div>
            <p className="label-caps mb-1 text-secondary">{text.patchNotes.eyebrow}</p>
            <h2 id="patch-notes-list-title" className="headline-title">{text.patchNotes.historyTitle}</h2>
          </div>
          <span className="label-caps shrink-0 rounded-full border border-outline-variant px-3 py-1 text-secondary">{entries.length} {text.patchNotes.releaseCount}</span>
        </section>

        <section aria-label={text.patchNotes.workspaceTitle}>
          <MobileReleaseBrowser entries={entries} locale={locale} />
          <div className="hidden lg:block">
            <PatchNotesBrowser entries={entries} locale={locale} />
          </div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}