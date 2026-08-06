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
      <main className="stitch-container pb-section-gap pt-8 sm:pt-16">
        <section className="mb-8 overflow-hidden rounded-3xl border border-primary/30 bg-primary/10 p-5 sm:mb-10 sm:p-8" data-major-preview-release>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{ui.major}</p>
          <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
            <div className="min-w-0">
              <p className="label-caps break-words text-secondary">{previewRelease.version} · {previewRelease.codename}</p>
              <h1 className="mt-3 font-serif text-[38px] leading-[1.02] text-on-surface sm:text-[56px]">{previewRelease.title}</h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-on-surface-variant sm:text-[17px]">{previewRelease.summary}</p>
            </div>
            <FlowButton href="/playground" text={ui.openChat} dark className="w-full" />
          </div>
          <div className="mt-6 grid gap-4 border-t border-primary/20 pt-6 md:grid-cols-2">
            <div className="rounded-2xl border border-outline-variant bg-surface/75 p-4">
              <p className="label-caps text-secondary">{ui.knownIssues}</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                {previewRelease.knownIssues.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-outline-variant bg-surface/75 p-4">
              <p className="label-caps text-secondary">{ui.migration}</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                {previewRelease.migrationNotes.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-6 border-b-[0.5px] border-primary pb-8 sm:mb-14 sm:gap-10 sm:pb-14 md:grid-cols-12">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-4 text-secondary sm:mb-6">{text.patchNotes.eyebrow}</p>
            <h2 className="display-title">{text.patchNotes.title}</h2>
            <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-sm sm:mt-8">
              <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-secondary">{ui.latest}</span>
              <strong className="min-w-0 break-words">{latestRelease.version}</strong>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.12} className="space-y-3 border-t border-primary pt-5 text-[15px] leading-[1.65] text-on-surface-variant sm:space-y-5 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0 sm:text-[17px] md:col-span-4 md:col-start-9">
            <p>{text.patchNotes.intro}</p>
            <p className="text-sm text-secondary">{ui.browse}</p>
          </ScrollReveal>
        </section>

        <section aria-labelledby="patch-notes-list-title">
          <ScrollReveal>
            <div className="mb-5 flex items-end justify-between gap-3 border-b-[0.5px] border-primary pb-5 sm:mb-8 sm:flex-row sm:pb-6">
              <h2 id="patch-notes-list-title" className="headline-title">{text.patchNotes.historyTitle}</h2>
              <span className="label-caps shrink-0 text-secondary">{entries.length} {text.patchNotes.releaseCount}</span>
            </div>
          </ScrollReveal>
          <MobileReleaseBrowser entries={entries} locale={locale} />
          <div className="hidden lg:block">
            <PatchNotesBrowser entries={entries} locale={locale} />
          </div>
        </section>

        <ScrollReveal>
          <section className="mt-section-gap flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:p-8 md:flex-row md:items-center md:p-10">
            <div className="min-w-0">
              <p className="label-caps break-words text-secondary">{latestRelease.version}</p>
              <p className="mt-3 max-w-xl font-serif text-[24px] sm:text-[26px]">{text.patchNotes.workspaceTitle}</p>
            </div>
            <FlowButton href="/playground" text={ui.openChat} dark />
          </section>
        </ScrollReveal>
      </main>
      <StitchFooter />
    </>
  );
}
