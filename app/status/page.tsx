import { StatusBoard } from "@/components/status/StatusBoard";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
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
        <section className="border-t-[0.5px] border-primary pt-10">
          <ScrollReveal>
            <h2 className="headline-title">{text.status.incidents}</h2>
            <p className="mt-5 max-w-2xl leading-[1.7] text-on-surface-variant">{text.status.historyNote}</p>
          </ScrollReveal>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
