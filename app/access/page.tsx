import Link from "next/link";
import type { Metadata } from "next";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { MAX_TOKENS_BY_TIER, type ErmaTier } from "@/lib/erma-public";

export const metadata: Metadata = {
  title: "TK LAB — Access",
  description: "Access levels and workspace limits.",
};

const tiers: ErmaTier[] = ["light", "medium", "heavy"];

export default async function AccessPage() {
  const locale = await getLocale();
  const text = getDictionary(locale);

  return (
    <>
      <StitchHeader active="access" />
      <main className="stitch-container py-section-gap">
        <section className="editorial-enter mb-section-gap grid gap-12 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="label-caps mb-7 text-secondary">{text.access.eyebrow}</p>
            <h1 className="display-title">{text.access.title}</h1>
          </div>
          <p className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">{text.access.intro}</p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {text.access.levels.map((level, index) => {
            const tokenCount = MAX_TOKENS_BY_TIER[tiers[index]].toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
            return (
              <article key={level.name} className="flex min-h-[390px] flex-col justify-between border border-primary bg-white p-8 md:p-10">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="label-caps text-secondary">{level.name}</span>
                    <span className="label-caps text-secondary">{text.access.tokens.replace("{n}", tokenCount)}</span>
                  </div>
                  <h2 className="mt-12 font-serif text-[32px]">{level.title}</h2>
                  <p className="mt-5 leading-[1.7] text-on-surface-variant">{level.description}</p>
                </div>
                <div>
                  <p className="label-caps mb-7 text-secondary">{level.note}</p>
                  <Link href="/playground" className="quiet-button quiet-button--dark w-full">{text.access.openLab}</Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-section-gap grid gap-10 border-t-[0.5px] border-primary pt-12 md:grid-cols-12">
          <h2 className="headline-title md:col-span-4">{text.access.howTitle}</h2>
          <div className="space-y-5 leading-[1.8] text-on-surface-variant md:col-span-7 md:col-start-6">
            <p>{text.access.howFirst}</p>
            <p>{text.access.howSecond}</p>
            <Link href="/login" className="quiet-button inline-flex">{text.access.signIn}</Link>
          </div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}