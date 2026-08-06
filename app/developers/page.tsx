import type { Metadata } from "next";
import Image from "next/image";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "TK LAB — Developers",
  description: "The developers behind the TK LAB system.",
};

export default async function DevelopersPage() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const teamLabel = locale === "ru" ? "Команда" : "Team";

  return (
    <>
      <StitchHeader active="developers" />
      <main className="stitch-container pb-section-gap pt-16">
        <section className="mb-section-gap grid gap-12 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-7 text-secondary">{text.developers.eyebrow}</p>
            <h1 className="display-title">{text.developers.title}</h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">
            {text.developers.intro}
          </ScrollReveal>
        </section>

        <section className="mb-section-gap">
          <ScrollReveal>
            <div className="mb-10 grid gap-6 border-b-[0.5px] border-primary pb-8 md:grid-cols-12">
              <h2 className="headline-title md:col-span-4">{text.developers.sectionTitle}</h2>
              <p className="text-on-surface-variant md:col-span-6 md:col-start-7">{text.developers.sectionIntro}</p>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid gap-px border border-primary bg-primary md:grid-cols-2">
            {text.developers.people.map((person, index) => (
              <StaggerItem key={person.name}>
                <article className="editorial-card bg-white p-8 md:p-10">
                  <div className="flex items-center justify-between border-b-[0.5px] border-primary pb-4">
                    <span className="label-caps text-secondary">0{index + 1} / {teamLabel}</span>
                    <span className="label-caps text-secondary">{person.role}</span>
                  </div>
                  <div className="relative mt-10 aspect-[4/5] overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low">
                    <Image
                      src={person.image}
                      alt={`${person.name} portrait`}
                      fill
                      sizes="(min-width: 768px) 42vw, 100vw"
                      className="object-cover object-top"
                    />
                  </div>
                  <h3 className="mt-8 font-serif text-[34px]">{person.name}</h3>
                  <p className="mt-4 max-w-md leading-[1.7] text-on-surface-variant">{person.description}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <ScrollReveal>
          <section className="overflow-hidden rounded-3xl border border-primary bg-white p-8 md:p-14">
            <div className="grid gap-8 md:grid-cols-12 md:items-center">
              <h2 className="headline-title md:col-span-5">{text.developers.noteTitle}</h2>
              <p className="leading-[1.8] text-on-surface-variant md:col-span-6 md:col-start-7">{text.developers.note}</p>
            </div>
          </section>
        </ScrollReveal>
      </main>
      <StitchFooter />
    </>
  );
}
