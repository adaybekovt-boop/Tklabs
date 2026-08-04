import { Check } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function StatusPage() {
  const text = getDictionary(await getLocale());

  return (
    <>
      <StitchHeader active="status" />
      <main className="stitch-container py-section-gap">
        <section className="editorial-enter mb-section-gap grid gap-12 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <div className="md:col-span-8">
            <p className="label-caps mb-6 text-secondary">{text.status.eyebrow}</p>
            <h1 className="display-title">{text.status.title}</h1>
            <p className="mt-6 max-w-xl text-[18px] leading-[1.6] text-on-surface-variant">{text.status.intro}</p>
          </div>
          <div className="flex items-end md:col-span-4">
            <div className="w-full border border-primary bg-white p-8">
              <span className="mb-5 block size-3 bg-primary" />
              <p className="headline-title text-[26px]">{text.status.allWorking}</p>
              <p className="label-caps mt-4 text-secondary">{text.status.checked}</p>
            </div>
          </div>
        </section>
        <section className="mb-section-gap">
          <h2 className="headline-title mb-8">{text.status.infrastructure}</h2>
          <div className="border-t-[0.5px] border-primary">
            {text.status.services.map((service, index) => (
              <div key={service} className="editorial-card grid items-center gap-4 border-b-[0.5px] border-primary/30 py-7 md:grid-cols-12">
                <span className="md:col-span-6">{service}</span>
                <span className="label-caps text-secondary md:col-span-3">{text.status.working}</span>
                <span className="flex items-center justify-end gap-3 text-[13px] md:col-span-3"><Check size={16} /> {index + 1} {text.status.ms}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="mb-8 flex items-end justify-between border-b-[0.5px] border-primary pb-6">
            <h2 className="headline-title">{text.status.incidents}</h2>
            <span className="label-caps text-secondary">{text.status.last90}</span>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {text.status.history.map(([date, title, description]) => (
              <article key={date} className="border border-outline-variant bg-white p-8">
                <p className="label-caps mb-8 text-secondary">{date}</p>
                <h3 className="font-serif text-[24px]">{title}</h3>
                <p className="mt-4 leading-[1.6] text-on-surface-variant">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}