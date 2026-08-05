import Link from "next/link";
import type { Metadata } from "next";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
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
        <section className="mb-section-gap grid gap-12 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-7 text-secondary">{text.access.eyebrow}</p>
            <h1 className="display-title">{text.access.title}</h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">
            {text.access.intro}
          </ScrollReveal>
        </section>

        <StaggerContainer className="grid gap-6 md:grid-cols-3">
          {text.access.levels.map((level, index) => {
            const tokenCount = MAX_TOKENS_BY_TIER[tiers[index]].toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
            return (
              <StaggerItem key={level.name}>
                <article className="flex flex-col justify-between overflow-hidden rounded-2xl border border-primary bg-white p-8 md:p-10">
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
                    <FlowButton href="/playground" text={text.access.openLab} dark className="w-full" />
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <section className="mt-section-gap grid gap-10 border-t-[0.5px] border-primary pt-12 md:grid-cols-12">
          <ScrollReveal className="md:col-span-4">
            <h2 className="headline-title">{text.access.howTitle}</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="space-y-5 leading-[1.8] text-on-surface-variant md:col-span-7 md:col-start-6">
            <p>{text.access.howFirst}</p>
            <p>{text.access.howSecond}</p>
            <FlowButton href="/login" text={text.access.signIn} />
          </ScrollReveal>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
