import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { ServerCluster } from "@/components/ui/server-cluster";
import { getDictionary } from "@/lib/i18n";
import { getLatestRelease } from "@/lib/latest-release";
import { getLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

const HERO_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuAYTVB_xIAGfQ1GmdoErspMpmszNyjX_bx_I0kf8cC0os8aetwXwoYoEsN8t8fBBgNJMQplpbGHuSFprZYXkzuFm8rLy6vRhJkhKHRHNRBC-dV-Jg6KyeSA0jjtPHYL5E-mGoFtlIahWoSz443B7RQMHivURhnPhEBkRctiCFkYPYwCqlXEe2-scdz4JuuHFVn2ebUWmRJOnykO4n25FtZa-mrt4EXDrCrArb59WcxZMv4lqYBHgcg0";
const LAB_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuCO03sRJnzhXJQCipz5tILXfn2MqcyWD_QUSBtCkp01NeZ66JwFPbzsiFE_peCk0Xw0TAXB75_v7W91GmR5bn3TxjWqkxORjcMKwA0SbV_KtLHa8CYRWNxpzRBQhTaG3-p0PJ-x2o6Ug4RVWBB-Vu65It4UWODNdOknGxorZPh9phPqgNcE6HfNpt_XoOgyY1n0at9IAyiBUbq_pvkteGlfp7QsNGZuNTbniMFnMJ5-h1hgKv3Qg-J8";

export default async function HomePage() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const latestRelease = getLatestRelease(locale);
  const releaseLabel = locale === "ru" ? "Последнее обновление" : "Latest update";
  const allReleases = locale === "ru" ? "Все обновления" : "All releases";

  return (
    <>
      <StitchHeader active="home" />
      <main>
        <section className="stitch-container mb-section-gap mt-8 grid items-center gap-8 sm:mt-12 sm:gap-10 lg:mt-20 lg:grid-cols-2 lg:gap-12">
          <ScrollReveal className="space-y-6 sm:space-y-8">
            <h1 className="display-title max-w-2xl">{text.home.title}</h1>
            <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:flex-row sm:gap-4 sm:pt-4">
              <FlowButton href="/playground" text={text.home.openLab} dark />
              <FlowButton href="/truth" text={text.home.howItWorks} />
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="relative aspect-[16/10] overflow-hidden rounded-3xl sm:aspect-[4/3] lg:aspect-auto lg:min-h-[500px]">
            <Image src={HERO_IMAGE} alt={text.home.heroAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" unoptimized className="object-cover grayscale" />
          </ScrollReveal>
        </section>

        <section className="stitch-container mb-section-gap">
          <ScrollReveal>
            <div className="mb-7 sm:mb-12">
              <h2 className="headline-title">{text.home.environmentTitle}</h2>
            </div>
          </ScrollReveal>
          <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-2">
            <ScrollReveal delay={0.1}>
              <div className="relative aspect-[16/10] overflow-hidden rounded-3xl sm:aspect-video">
                <Image src={LAB_IMAGE} alt={text.home.labAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" unoptimized className="object-cover grayscale" />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2} className="flex items-center justify-center py-3 sm:py-8 lg:py-0">
              <ServerCluster />
            </ScrollReveal>
          </div>
        </section>

        <section className="stitch-container mb-section-gap">
          <ScrollReveal>
            <div className="mb-4 flex items-end justify-between border-b-[0.5px] border-primary pb-5 sm:pb-6">
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
          <StaggerContainer className="grid gap-2.5 md:hidden" staggerDelay={0.08}>
            {text.home.rows.map(([model, purpose, limit, status]) => (
              <StaggerItem key={model}>
                <article className="overflow-hidden rounded-2xl border border-outline-variant bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-[21px] sm:text-[22px]">{model}</h3>
                    <span className="label-caps shrink-0 text-secondary">{status}</span>
                  </div>
                  <p className="mt-3 text-[14px] leading-[1.6] text-on-surface-variant sm:mt-4">{purpose}</p>
                  <p className="label-caps mt-4 text-secondary sm:mt-5">{limit}</p>
                </article>
              </StaggerItem>
            ))}
            <StaggerItem>
              <p className="overflow-hidden rounded-2xl border border-outline-variant bg-white p-4 text-[14px] leading-[1.6] text-on-surface-variant sm:p-5">{text.home.accessNote}</p>
            </StaggerItem>
          </StaggerContainer>
        </section>

        <section className="stitch-container mb-section-gap">
          <ScrollReveal>
            <article className="relative overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-10 md:p-14">
              <div className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-surface-container-high blur-3xl" aria-hidden="true" />
              <div className="relative grid gap-7 sm:gap-10 md:grid-cols-12 md:items-start">
                <div className="flex items-center gap-4 md:col-span-3 md:block">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low sm:size-12">
                    <Sparkles size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="label-caps text-secondary md:mt-6">{releaseLabel}</p>
                    <p className="mt-1 font-serif text-[25px] md:mt-3 md:text-[28px]">{latestRelease.version}</p>
                    <p className="mt-1 text-xs text-secondary md:mt-2 md:text-sm">{latestRelease.date}</p>
                  </div>
                </div>
                <div className="md:col-span-8 md:col-start-5">
                  <h2 className="headline-title">{latestRelease.title}</h2>
                  <p className="mt-4 max-w-3xl leading-[1.7] text-on-surface-variant sm:mt-5 sm:leading-[1.75]">{latestRelease.summary}</p>
                  <ul className="mt-5 grid gap-2 sm:mt-7 sm:grid-cols-2 sm:gap-3">
                    {latestRelease.changes.slice(0, 4).map((change, index) => (
                      <li
                        key={change}
                        className={cn(
                          "rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-[1.6] text-on-surface-variant",
                          index > 1 && "hidden sm:block",
                        )}
                      >
                        <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">{String(index + 1).padStart(2, "0")}</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                  <Link href="/patch-notes" className="mt-6 inline-flex min-h-11 items-center gap-2 border-b border-primary pb-1 font-medium text-primary sm:mt-8">
                    {allReleases}<ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
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
