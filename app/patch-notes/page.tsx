import type { Metadata } from "next";

import { MobileReleaseBrowser } from "@/components/site/MobileReleaseBrowser";
import { PatchNotesBrowser } from "@/components/site/PatchNotesBrowser";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLatestRelease, getPreviousReleaseV0110, getPreviousReleaseV0111 } from "@/lib/latest-release";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "TK LAB — Patch Notes",
  description: "English-language release notes for TK LAB.",
};

export default async function PatchNotesPage() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const latestRelease = getLatestRelease(locale);
  const previousRelease = getPreviousReleaseV0111(locale);
  const earlierRelease = getPreviousReleaseV0110(locale);
  const preservedVersions = new Set([latestRelease.version, previousRelease.version, earlierRelease.version]);
  const entries = [
    latestRelease,
    previousRelease,
    earlierRelease,
    ...text.patchNotes.entries.filter((entry) => !preservedVersions.has(entry.version)),
  ];
  const ui = locale === "ru"
    ? {
        latest: "Актуальная версия",
        browse: "Ищите по словам, выбирайте версию и открывайте только нужный релиз.",
        openChat: "Открыть AI-чат",
      }
    : {
        latest: "Current release",
        browse: "Search by keyword, choose a version, and open only the release you need.",
        openChat: "Open AI chat",
      };

  return (
    <>
      <StitchHeader active="patch-notes" />
      <main className="stitch-container pb-section-gap pt-8 sm:pt-16">
        <section className="mb-8 grid gap-6 border-b-[0.5px] border-primary pb-8 sm:mb-14 sm:gap-10 sm:pb-14 md:grid-cols-12">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-4 text-secondary sm:mb-6">{text.patchNotes.eyebrow}</p>
            <h1 className="display-title">{text.patchNotes.title}</h1>
            <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-sm sm:mt-8">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-secondary">{ui.latest}</span>
              <strong>{latestRelease.version}</strong>
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
            <div>
              <p className="label-caps text-secondary">{latestRelease.version}</p>
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
