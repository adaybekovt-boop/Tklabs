import type { Metadata } from "next";
import Link from "next/link";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "TK LAB — Patch Notes",
  description: "English-language release notes for TK LAB.",
};

export default async function PatchNotesPage() {
  const text = getDictionary(await getLocale());

  return (
    <>
      <StitchHeader active="patch-notes" />
      <main className="stitch-container pb-section-gap pt-16">
        <section className="editorial-enter mb-section-gap grid gap-12 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="label-caps mb-7 text-secondary">{text.patchNotes.eyebrow}</p>
            <h1 className="display-title">{text.patchNotes.title}</h1>
          </div>
          <p className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">{text.patchNotes.intro}</p>
        </section>

        <section aria-labelledby="patch-notes-list-title">
          <div className="mb-10 flex items-end justify-between border-b-[0.5px] border-primary pb-6">
            <h2 id="patch-notes-list-title" className="headline-title">Release history</h2>
            <span className="label-caps text-secondary">{text.patchNotes.entries.length} releases</span>
          </div>
          <div className="border-t-[0.5px] border-primary">
            {text.patchNotes.entries.map((entry) => (
              <article key={entry.version} className="grid gap-8 border-b-[0.5px] border-primary py-10 md:grid-cols-12 md:gap-6">
                <div className="md:col-span-3">
                  <p className="label-caps text-secondary">{entry.date}</p>
                  <p className="mt-3 font-serif text-[25px]">{entry.version}</p>
                </div>
                <div className="md:col-span-8 md:col-start-5">
                  <h3 className="font-serif text-[30px] leading-[1.2]">{entry.title}</h3>
                  <p className="mt-4 max-w-2xl leading-[1.7] text-on-surface-variant">{entry.summary}</p>
                  <ul className="mt-7 space-y-3 border-l border-primary pl-5 text-[15px] leading-[1.7]">
                    {entry.changes.map((change) => <li key={change}>{change}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-section-gap flex flex-col items-start justify-between gap-6 border border-primary bg-white p-8 md:flex-row md:items-center md:p-10">
          <div>
            <p className="label-caps text-secondary">TK LAB / WORKSPACE</p>
            <p className="mt-3 font-serif text-[26px]">Keep building with the latest system version.</p>
          </div>
          <Link href="/playground" className="quiet-button quiet-button--dark">{text.patchNotes.openLaboratory}</Link>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
