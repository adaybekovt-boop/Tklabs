import Link from "next/link";
import Image from "next/image";
import { FlaskConical } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { ServerCluster } from "@/components/ui/server-cluster";
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
          <ScrollReveal className="space-y-8">
            <h1 className="display-title max-w-2xl">{text.home.title}</h1>
            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <FlowButton href="/playground" text={text.home.openLab} dark />
              <FlowButton href="/truth" text={text.home.howItWorks} />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="relative aspect-[4/5] overflow-hidden rounded-3xl lg:aspect-auto lg:min-h-[500px]">
            <Image src={HERO_IMAGE} alt={text.home.heroAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" unoptimized className="object-cover grayscale" />
          </ScrollReveal>
        </section>

        <section className="stitch-container mb-section-gap">
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="headline-title">{text.home.environmentTitle}</h2>
            </div>
          </ScrollReveal>
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <ScrollReveal delay={0.1}>
              <div className="relative aspect-video overflow-hidden rounded-3xl">
                <Image src={LAB_IMAGE} alt={text.home.labAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" unoptimized className="object-cover grayscale" />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2} className="flex items-center justify-center py-8 lg:py-0">
              <ServerCluster />
            </ScrollReveal>
          </div>
        </section>

        <section className="stitch-container mb-section-gap">
          <ScrollReveal>
            <div className="mb-4 flex items-end justify-between border-b-[0.5px] border-primary pb-6">
              <h2 className="headline-title">{text.home.modesTitle}</h2>
              <Link href="/models" className="label-caps text-secondary transition-colors hover:text-primary">{text.footer.models} ↗</Link>
            </div>
          </ScrollReveal>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
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
          <StaggerContainer className="grid gap-3 md:hidden" staggerDelay={0.08}>
            {text.home.rows.map(([model, purpose, limit, status]) => (
              <StaggerItem key={model}>
                <article className="overflow-hidden rounded-2xl border border-outline-variant bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-[22px]">{model}</h3>
                    <span className="label-caps shrink-0 text-secondary">{status}</span>
                  </div>
                  <p className="mt-4 text-[14px] leading-[1.6] text-on-surface-variant">{purpose}</p>
                  <p className="label-caps mt-5 text-secondary">{limit}</p>
                </article>
              </StaggerItem>
            ))}
            <StaggerItem>
              <p className="overflow-hidden rounded-2xl border border-outline-variant bg-white p-5 text-[14px] leading-[1.6] text-on-surface-variant">{text.home.accessNote}</p>
            </StaggerItem>
          </StaggerContainer>
        </section>

        <section className="stitch-container mb-section-gap">
          <ScrollReveal>
            <div className="quiet-grid relative overflow-hidden rounded-3xl border border-primary bg-white px-8 py-20 text-center md:p-24">
              <div className="relative z-10 mx-auto max-w-2xl space-y-8">
                <FlaskConical className="mx-auto" size={38} strokeWidth={1.3} />
                <h2 className="headline-title">{text.home.labTitle}</h2>
                <p className="label-caps text-secondary">{text.home.labNote}</p>
                <div className="pt-6">
                  <FlowButton href="/playground" text={text.home.enterLab} dark />
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>
        <section className="mx-auto mb-section-gap max-w-3xl px-margin-mobile text-center">
          <ScrollReveal>
            <p className="leading-[1.6] text-secondary">{text.home.disclosure}</p>
            <Link href="/truth" className="mt-4 inline-block border-b border-primary pb-1">{text.home.principles}</Link>
          </ScrollReveal>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
