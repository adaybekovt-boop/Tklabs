import { notFound } from "next/navigation";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

type LegalDocKey = "terms" | "api" | "privacy";

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (doc !== "terms" && doc !== "api" && doc !== "privacy") notFound();

  const text = getDictionary(await getLocale());
  const document = text.legal[doc as LegalDocKey];

  return (
    <>
      <StitchHeader />
      <main className="stitch-container py-section-gap">
        <header className="mb-section-gap border-b border-primary pb-8">
          <ScrollReveal>
            <p className="label-caps mb-7 text-secondary">{document.label}</p>
            <h1 className="display-title">{document.title}</h1>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.6] text-on-surface-variant">{document.intro}</p>
          </ScrollReveal>
        </header>
        <article className="grid gap-12 md:grid-cols-12">
          <aside className="md:col-span-3">
            <nav className="sticky top-28 flex flex-col gap-4 text-[13px] text-secondary">
              <span className="label-caps mb-3 text-primary">{text.legal.contents}</span>
              {document.sections.map(([title]) => <a key={title} href={"#" + title}>{title}</a>)}
            </nav>
          </aside>
          <StaggerContainer className="space-y-20 md:col-span-7 md:col-start-5" staggerDelay={0.12}>
            {document.sections.map(([title, paragraph, detail]) => (
              <StaggerItem key={title}>
                <section id={title}>
                  <h2 className="headline-title mb-6">{title}</h2>
                  <div className="space-y-5 leading-[1.8] text-on-surface-variant">
                    <p>{paragraph}</p>
                    <p>{detail}</p>
                  </div>
                </section>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </article>
      </main>
      <StitchFooter />
    </>
  );
}
