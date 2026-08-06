import type { Metadata } from "next";

import { PatchNotesBrowser } from "@/components/site/PatchNotesBrowser";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLatestRelease } from "@/lib/latest-release";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "TK LAB — Patch Notes",
  description: "English-language release notes for TK LAB.",
};

export default async function PatchNotesPage() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const latestRelease = getLatestRelease(locale);
  const entries = [latestRelease, ...text.patchNotes.entries.filter((entry) => entry.version !== latestRelease.version)];
  const ui = locale === "ru"
    ? {
        latest: "Актуальная версия",
        browse: "Ищите по словам, выбирайте версию слева и раскрывайте только нужные изменения.",
        openChat: "Открыть AI-чат",
      }
    : {
        latest: "Current release",
        browse: "Search by keyword, choose a version, and expand only the changes you need.",
        openChat: "Open AI chat",
      };

  return (
    <>
      <StitchHeader active="patch-notes" />
      <main className="stitch-container pb-section-gap pt-16">
        <section className="mb-14 grid gap-10 border-b-[0.5px] border-primary pb-14 md:grid-cols-12">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-6 text-secondary">{text.patchNotes.eyebrow}</p>
            <h1 className="display-title">{text.patchNotes.title}</h1>
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-sm">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-secondary">{ui.latest}</span>
              <strong>{latestRelease.version}</strong>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.12} className="space-y-5 border-l border-primary pl-7 text-[17px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">
            <p>{text.patchNotes.intro}</p>
            <p className="text-sm text-secondary">{ui.browse}</p>
          </ScrollReveal>
        </section>

        <section aria-labelledby="patch-notes-list-title">
          <ScrollReveal>
            <div className="mb-8 flex flex-col gap-3 border-b-[0.5px] border-primary pb-6 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="patch-notes-list-title" className="headline-title">{text.patchNotes.historyTitle}</h2>
              <span className="label-caps text-secondary">{entries.length} {text.patchNotes.releaseCount}</span>
            </div>
          </ScrollReveal>
          <PatchNotesBrowser entries={entries} locale={locale} />
        </section>

        <ScrollReveal>
          <section className="mt-section-gap flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-low p-8 md:flex-row md:items-center md:p-10">
            <div>
              <p className="label-caps text-secondary">{latestRelease.version}</p>
              <p className="mt-3 max-w-xl font-serif text-[26px]">{text.patchNotes.workspaceTitle}</p>
            </div>
            <FlowButton href="/playground" text={ui.openChat} dark />
          </section>
        </ScrollReveal>
      </main>
      <StitchFooter />
    </>
  );
}
