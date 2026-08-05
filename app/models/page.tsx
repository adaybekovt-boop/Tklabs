import Link from "next/link";
import type { Metadata } from "next";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { PUBLIC_ERMA_MODELS, type PublicErmaModel } from "@/lib/erma-public";

export const metadata: Metadata = {
  title: "TK LAB — Models",
  description: "Erma models and working modes.",
};

function modelDescription(model: PublicErmaModel, text: ReturnType<typeof getDictionary>) {
  if (model.tier === "light") return model.reasoning ? text.models.descriptions.lightReasoning : text.models.descriptions.lightQuick;
  if (model.tier === "medium") return text.models.descriptions.medium;
  return model.vision ? text.models.descriptions.heavyVision : text.models.descriptions.heavy;
}

export default async function ModelsPage() {
  const text = getDictionary(await getLocale());

  return (
    <>
      <StitchHeader active="models" />
      <main className="stitch-container py-section-gap">
        <section className="mb-section-gap grid gap-12 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-7 text-secondary">{text.models.eyebrow}</p>
            <h1 className="display-title">{text.models.title}</h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">
            {text.models.intro}
          </ScrollReveal>
        </section>

        <StaggerContainer className="mb-section-gap grid gap-px border border-primary bg-primary md:grid-cols-3">
          {text.models.cycles.map(([name, label, description]) => (
            <StaggerItem key={name}>
              <div className="bg-white p-8 md:p-10">
                <span className="label-caps text-secondary">{name}</span>
                <h2 className="mt-8 font-serif text-[28px]">{label}</h2>
                <p className="mt-4 leading-[1.7] text-on-surface-variant">{description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <section>
          <ScrollReveal>
            <div className="mb-8 flex items-end justify-between border-b-[0.5px] border-primary pb-6">
              <h2 className="headline-title">{text.models.catalogTitle}</h2>
              <span className="label-caps text-secondary">{PUBLIC_ERMA_MODELS.length} {text.models.modelCount}</span>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid gap-4 md:grid-cols-2" staggerDelay={0.1}>
            {PUBLIC_ERMA_MODELS.map((model) => (
              <StaggerItem key={model.key}>
                <Link href={"/playground?model=" + model.key} className="editorial-card group block overflow-hidden rounded-2xl border border-outline-variant bg-white p-8 transition-colors hover:border-primary md:p-10">
                  <div className="flex items-start justify-between gap-6">
                    <span className="text-secondary transition-transform group-hover:translate-x-1">↗</span>
                  </div>
                  <h3 className="mt-8 font-serif text-[30px]">{model.name}</h3>
                  <p className="mt-4 max-w-lg leading-[1.7] text-on-surface-variant">{modelDescription(model, text)}</p>
                  <span className="label-caps mt-10 inline-block border-b border-primary pb-1">{text.models.openInLab}</span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
