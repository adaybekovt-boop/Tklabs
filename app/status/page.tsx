import { StatusBoard } from "@/components/status/StatusBoard";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function StatusPage() {
  const locale = await getLocale();
  const text = getDictionary(locale);

  return (
    <>
      <StitchHeader active="status" />
      <main className="stitch-container py-section-gap">
        <section className="mb-section-gap grid gap-12 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-6 text-secondary">{text.status.eyebrow}</p>
            <h1 className="display-title">{text.status.title}</h1>
            <p className="mt-6 max-w-xl text-[18px] leading-[1.6] text-on-surface-variant">{text.status.intro}</p>
          </ScrollReveal>
        </section>
        <StatusBoard locale={locale} />
        <section>
          <ScrollReveal>
            <div className="mb-8 flex flex-col items-start gap-3 border-b-[0.5px] border-primary pb-6 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="headline-title">{text.status.incidents}</h2>
              <span className="label-caps text-secondary">{text.status.last90}</span>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid gap-6 md:grid-cols-3" staggerDelay={0.1}>
            {text.status.history.map(([date, title, description]) => (
              <StaggerItem key={date}>
                <article className="overflow-hidden rounded-2xl border border-outline-variant bg-white p-8">
                  <p className="label-caps mb-8 text-secondary">{date}</p>
                  <h3 className="font-serif text-[24px]">{title}</h3>
                  <p className="mt-4 leading-[1.6] text-on-surface-variant">{description}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
