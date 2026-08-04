import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "TK LAB — Documentation",
  description: "API, models, access, and system principles.",
};

export default async function DocumentationPage() {
  const text = getDictionary(await getLocale());

  return (
    <>
      <StitchHeader active="documentation" />
      <main className="stitch-container py-section-gap">
        <section className="editorial-enter mb-section-gap grid gap-12 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="label-caps mb-7 text-secondary">{text.documentation.eyebrow}</p>
            <h1 className="display-title">{text.documentation.title}</h1>
          </div>
          <p className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">{text.documentation.intro}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {text.documentation.documents.map((document) => (
            <Link key={document.href} href={document.href} className="editorial-card group border border-outline-variant bg-white p-8 transition-colors hover:border-primary md:p-10">
              <div className="flex items-start justify-between gap-4">
                <span className="label-caps text-secondary">{document.label}</span>
                <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              <h2 className="mt-12 font-serif text-[30px]">{document.title}</h2>
              <p className="mt-4 max-w-lg leading-[1.7] text-on-surface-variant">{document.description}</p>
              <span className="label-caps mt-10 inline-block border-b border-primary pb-1">{text.documentation.openSection}</span>
            </Link>
          ))}
        </section>

        <section className="mt-section-gap border border-primary bg-white p-10 md:p-14">
          <div className="grid gap-8 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7">
              <p className="label-caps mb-5 text-secondary">{text.documentation.quickStart}</p>
              <h2 className="headline-title">{text.documentation.quickTitle}</h2>
            </div>
            <div className="md:col-span-4 md:col-start-9">
              <Link href="/playground" className="quiet-button quiet-button--dark w-full">{text.documentation.openLab}</Link>
            </div>
          </div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}