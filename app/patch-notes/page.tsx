import type { Metadata } from "next";

import { MobileReleaseBrowser } from "@/components/site/MobileReleaseBrowser";
import { PatchNotesBrowser } from "@/components/site/PatchNotesBrowser";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
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
  const latestRelease = previewRelease;
  const ui = locale === "ru"
    ? {
        latest: "Предварительная версия",
        browse: "Ищите по словам, выбирайте версию и открывайте только нужный релиз.",
        openChat: "Открыть Erma Nova",
        major: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ",
        knownIssues: "Известные ограничения preview",
        migration: "Совместимость и миграция",
      }
    : {
        latest: "Preview release",
        browse: "Search by keyword, choose a version, and open only the release you need.",
        openChat: "Open Erma Nova",
        major: "MAJOR UPDATE · PRE-RELEASE",
        knownIssues: "Known preview limitations",
        migration: "Compatibility and migration",
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
          <div className="mt-4 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-[28px] leading-[1.12] text-on-surface sm:text-[38px]">{previewRelease.title}</h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-on-surface-variant sm:text-[15px]">{previewRelease.summary}</p>
            </div>
            <FlowButton href="/playground" text={ui.openChat} dark className="shrink-0" />
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
        </section>

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4" aria-labelledby="patch-notes-list-title">
          <div>
            <p className="label-caps mb-1 text-secondary">{text.patchNotes.eyebrow}</p>
            <h2 id="patch-notes-list-title" className="headline-title">{text.patchNotes.historyTitle}</h2>
          </div>
          <span className="label-caps shrink-0 rounded-full border border-outline-variant px-3 py-1 text-secondary">{entries.length} {text.patchNotes.releaseCount}</span>
        </section>

        <section>
          <MobileReleaseBrowser entries={entries} locale={locale} />
          <div className="hidden lg:block">
            <PatchNotesBrowser entries={entries} locale={locale} />
          </div>
        </section>

        <ScrollReveal>
          <section className="mt-10 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="min-w-0">
              <p className="label-caps text-secondary">{latestRelease.version}</p>
              <p className="mt-1 font-serif text-xl text-primary sm:text-2xl">{text.patchNotes.workspaceTitle}</p>
            </div>
            <FlowButton href="/playground" text={ui.openChat} dark />
          </section>
        </ScrollReveal>
      </main>
      <StitchFooter />
    </>
  );
}
