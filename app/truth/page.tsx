import Link from "next/link";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const STRUCTURE_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuCBxAq9hmy9JyW-l1ulR0TchevhjfsPGm8sXdbyz6gSH55NgWXtSIho64_rFz0Hn1Yb4Na9b_soaP4Nm2MyBfZMBgsMWBKtiEWEWOnaHnZDS3U405VzA-N3weTtwdAI1UTvAGMH9wTW-LYD4vfwbhiaOWeTuDcyk4KMyWH2JkbaLcrazgGCcnyEcaqAYdzInHre8T_fhY8idFddMcjrxjOZ2jqKIEuFwpRlF9ygohWpRlF9ygohWpBQclUvTbFoaH";
const PAPER_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuCLV1LWdczkuAT2b41I9oewlV6Hp__lg2SW9yxNTLEgh2u_Y_-7beANHLUwxpagBLAgBxlk9jzEBYDser4f19yAfZrQu5oFW0ktO8IiKsiTbm_qYKAko_0LbBaX8T1O747hCeDd1kgj8KJbQLR6qXVAAAMlZM6ubd4pDm_FRQRJ8xwM4S69T2EwVrPMW6gBP3DDdf-9D1I5pp7jiqE_Pb0oRWGhd6ZQn_WGUXMuAqa9qn2_Tr-Mul2M";

export default async function TruthPage() {
  const text = getDictionary(await getLocale());

  return (
    <>
      <StitchHeader active="truth" />
      <main className="stitch-container pb-section-gap pt-16">
        <section className="editorial-enter mb-section-gap grid items-end gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="label-caps mb-8 text-secondary">{text.truth.eyebrow}</p>
            <h1 className="display-title">{text.truth.title}</h1>
          </div>
          <p className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">{text.truth.intro}</p>
        </section>
        <section className="mb-section-gap grid gap-6 md:grid-cols-12">
          <div className="relative min-h-[560px] md:col-span-8">
            <img src={STRUCTURE_IMAGE} alt={text.truth.structureAlt} className="absolute inset-0 h-full w-full object-cover grayscale" />
          </div>
          <div className="flex flex-col justify-between border border-primary bg-white p-10 md:col-span-4">
            <span className="label-caps text-secondary">{text.truth.principle}</span>
            <div>
              <h2 className="headline-title mb-6">{text.truth.principleTitle}</h2>
              <p className="leading-[1.8] text-on-surface-variant">{text.truth.principleText}</p>
            </div>
          </div>
        </section>
        <section className="mb-section-gap">
          <div className="mb-10 grid gap-6 border-b-[0.5px] border-primary pb-8 md:grid-cols-12">
            <h2 className="headline-title md:col-span-4">{text.truth.registry}</h2>
            <p className="text-on-surface-variant md:col-span-6 md:col-start-7">{text.truth.registryIntro}</p>
          </div>
          <div className="border-t-[0.5px] border-primary">
            {text.truth.registryRows.map(([name, description, kind]) => (
              <div key={name} className="grid gap-4 border-b-[0.5px] border-primary/25 py-7 md:grid-cols-12">
                <span className="md:col-span-4">{name}</span>
                <span className="text-on-surface-variant md:col-span-5">{description}</span>
                <span className="label-caps text-right md:col-span-3">{kind}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="relative min-h-[360px] overflow-hidden">
          <img src={PAPER_IMAGE} alt={text.truth.paperAlt} className="absolute inset-0 h-full w-full object-cover grayscale opacity-80" />
          <div className="absolute inset-0 bg-white/55" />
          <div className="relative z-10 flex min-h-[360px] flex-col items-center justify-center px-8 text-center">
            <h2 className="headline-title max-w-xl">{text.truth.docsTitle}</h2>
            <Link href="/legal/api" className="quiet-button quiet-button--dark mt-8">{text.truth.openApi}</Link>
          </div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}