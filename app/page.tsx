import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const HERO_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuAYTVB_xIAGfQ1GmdoErspMpmszNyjX_bx_I0kf8cC0os8aetwXwoYoEsN8t8fBBgNJMQplpbGHuSFprZYXkzuFm8rLy6vRhJkhKHRHNRBC-dV-Jg6KyeSA0jjtPHYL5E-mGoFtlIahWoSz443B7RQMHivURhnPhEBkRctiCFkYPYwCqlXEe2-scdz4JuuHFVn2ebUWmRJOnykO4n25FtZa-mrt4EXDrCrArb59WcxZMv4lqYBHgcg0";
const LAB_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuCO03sRJnzhXJQCipz5tILXfn2MqcyWD_QUSBtCkp01NeZ66JwFPbzsiFE_peCk0Xw0TAXB75_v7W91GmR5bn3TxjWqkxORjcMKwA0SbV_KtLHa8CYRWNxpzRBQhTaG3-p0PJ-x2o6Ug4RVWBB-Vu65It4UWODNdOknGxorZPh9phPqgNcE6HfNpt_XoOgyY1n0at9IAyiBUbq_pvkteGlfp7QsNGZuNTbniMFnMJ5-h1hgKv3Qg-J8";

export default async function HomePage() {
  const text = getDictionary(await getLocale());

  return (
    <>
      <StitchHeader active="home" />
      <main>
        <section className="stitch-container mt-20 mb-section-gap grid items-center gap-12 lg:grid-cols-2">
          <div className="editorial-enter space-y-8">
            <h1 className="display-title max-w-2xl">{text.home.title}</h1>
            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Link className="quiet-button quiet-button--dark" href="/playground">{text.home.openLab}</Link>
              <Link className="quiet-button" href="/truth">{text.home.howItWorks}</Link>
            </div>
          </div>
          <div className="editorial-enter-delay relative min-h-[500px]">
            <img src={HERO_IMAGE} alt={text.home.heroAlt} className="absolute inset-0 h-full w-full object-cover grayscale" />
          </div>
        </section>

        <section className="stitch-container mb-section-gap">
          <div className="mb-12">
            <h2 className="headline-title">{text.home.environmentTitle}</h2>
          </div>
          <div><img src={LAB_IMAGE} alt={text.home.labAlt} className="aspect-video w-full object-cover grayscale" /></div>
        </section>

        <section className="stitch-container mb-section-gap">
          <div className="mb-4 flex items-end justify-between border-b-[0.5px] border-primary pb-6">
            <h2 className="headline-title">{text.home.modesTitle}</h2>
            <Link href="/models" className="label-caps text-secondary transition-colors hover:text-primary">{text.footer.models} ↗</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b-[0.5px] border-primary">
                  <th className="label-caps py-4 font-normal text-secondary">{text.home.tableModel}</th>
                  <th className="label-caps py-4 font-normal text-secondary">{text.home.tablePurpose}</th>
                  <th className="label-caps py-4 font-normal text-secondary">{text.home.tableLimit}</th>
                  <th className="label-caps py-4 text-right font-normal text-secondary">{text.home.tableStatus}</th>
                </tr>
              </thead>
              <tbody>
                {text.home.rows.map((row) => (
                  <tr key={row[0]} className="editorial-card border-b-[0.5px] border-primary/20 hover:bg-white">
                    {row.map((cell, index) => <td key={cell} className={"py-6 " + (index > 0 ? "text-on-surface-variant " : "") + (index === 3 ? "text-right" : "")}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-b-[0.5px] border-primary bg-white">
                  <td colSpan={3} className="py-6">{text.home.accessNote}</td>
                  <td className="py-6 text-right">{text.home.threeLevels}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="stitch-container mb-section-gap">
          <div className="quiet-grid relative overflow-hidden border border-primary bg-white px-8 py-20 text-center md:p-24">
            <div className="relative z-10 mx-auto max-w-2xl space-y-8">
              <FlaskConical className="mx-auto" size={38} strokeWidth={1.3} />
              <h2 className="headline-title">{text.home.labTitle}</h2>
              <p className="label-caps text-secondary">{text.home.labNote}</p>
              <div className="pt-6"><Link href="/playground" className="quiet-button quiet-button--dark px-12">{text.home.enterLab}</Link></div>
            </div>
          </div>
        </section>
        <section className="mx-auto mb-section-gap max-w-3xl px-margin-mobile text-center">
          <p className="leading-[1.6] text-secondary">{text.home.disclosure}</p>
          <Link href="/truth" className="mt-4 inline-block border-b border-primary pb-1">{text.home.principles}</Link>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}