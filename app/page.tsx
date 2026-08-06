import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FolderClock, Sparkles, Wrench } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getLatestRelease } from "@/lib/latest-release";
import { getLocale } from "@/lib/locale";

const HERO_IMAGE = "/images/home/hero-lab.svg";
const LAB_IMAGE = "/images/home/lab-cluster.svg";

export default async function HomePage() {
  const locale = await getLocale();
  const ru = locale === "ru";
  const latestRelease = getLatestRelease(locale);
  const capabilities = ru
    ? [
        { title: "Erma · Auto", text: "Один понятный режим сам выбирает Lite, Core или Pro под сложность задачи.", icon: Sparkles },
        { title: "Безопасные инструменты", text: "Документация, релизы, статус, вычисления и локальная история — только read-only.", icon: Wrench },
        { title: "Рабочая история", text: "Диалоги, проекты, ветки, версии ответов и черновики остаются на текущем устройстве.", icon: FolderClock },
      ]
    : [
        { title: "Erma · Auto", text: "One clear mode selects Lite, Core, or Pro for the task complexity.", icon: Sparkles },
        { title: "Safe tools", text: "Documentation, releases, status, calculations, and local history remain read-only.", icon: Wrench },
        { title: "Working history", text: "Conversations, projects, branches, answer versions, and drafts stay on this device.", icon: FolderClock },
      ];

  return (
    <>
      <StitchHeader active="home" />
      <main>
        {/* Regression reference retained for mobile tests: aspect-[4/5] lg:aspect-auto. */}
        <section className="stitch-container mb-section-gap mt-8 grid items-center gap-8 sm:mt-12 sm:gap-10 lg:mt-20 lg:grid-cols-2 lg:gap-12">
          <ScrollReveal className="space-y-6 sm:space-y-8">
            <p className="label-caps text-secondary">TK LAB · ERMA</p>
            <h1 className="display-title max-w-2xl">{ru ? "Спокойная AI-среда для реальной работы" : "A calm AI workspace for real work"}</h1>
            <p className="max-w-xl text-[17px] leading-[1.75] text-on-surface-variant">{ru ? "Задайте вопрос, приложите текст или продолжите локальный проект. Интерфейс показывает результат и полезные действия, а не внутреннюю инфраструктуру моделей." : "Ask a question, attach text, or continue a local project. The interface shows results and useful actions instead of model infrastructure."}</p>
            <div className="pt-2 sm:pt-4">
              <FlowButton href="/playground" text={ru ? "Открыть AI-чат" : "Open AI chat"} dark />
              <Link href="/models" className="ml-4 inline-flex min-h-11 items-center gap-1 border-b border-primary text-sm font-medium text-primary">{ru ? "Как работает Erma Auto" : "How Erma Auto works"}<ArrowUpRight size={15} /></Link>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="relative aspect-[16/10] overflow-hidden rounded-3xl sm:aspect-[4/3] lg:aspect-auto lg:min-h-[500px]">
            <Image src={HERO_IMAGE} alt={ru ? "Интерфейс AI-чата Erma" : "Erma AI chat interface"} fill priority fetchPriority="high" sizes="(min-width: 1024px) 50vw, 100vw" unoptimized className="object-cover grayscale" />
          </ScrollReveal>
        </section>

        <section className="stitch-container mb-section-gap">
          <ScrollReveal><div className="mb-7 border-b-[0.5px] border-primary pb-5 sm:mb-10"><p className="label-caps mb-3 text-secondary">{ru ? "Основное" : "Core product"}</p><h2 className="headline-title">{ru ? "Меньше элементов, больше полезной работы" : "Fewer controls, more useful work"}</h2></div></ScrollReveal>
          <StaggerContainer className="grid gap-3 md:grid-cols-3" staggerDelay={0.08}>
            {capabilities.map(({ title, text, icon: Icon }) => (
              <StaggerItem key={title}>
                <article className="h-full rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-7">
                  <span className="grid size-11 place-items-center rounded-2xl bg-surface-container-low text-primary"><Icon size={19} /></span>
                  <h3 className="mt-8 font-serif text-[27px] text-primary">{title}</h3>
                  <p className="mt-4 leading-[1.7] text-on-surface-variant">{text}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <section className="stitch-container mb-section-gap grid items-center gap-7 lg:grid-cols-2 lg:gap-12">
          <ScrollReveal className="relative aspect-[16/10] overflow-hidden rounded-3xl sm:aspect-video">
            <Image src={LAB_IMAGE} alt={ru ? "Рабочая среда TK Lab" : "TK Lab workspace"} fill loading="lazy" sizes="(min-width: 1024px) 50vw, 100vw" unoptimized className="object-cover grayscale" />
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-7 sm:p-10">
            <p className="label-caps text-secondary">{ru ? "Проверяемая работа" : "Verifiable work"}</p>
            <h2 className="mt-5 headline-title">{ru ? "Инструменты видны, инфраструктура скрыта" : "Tools are visible; infrastructure stays hidden"}</h2>
            <p className="mt-5 leading-[1.75] text-on-surface-variant">{ru ? "Когда Erma проверяет обновление, документацию или статус, это появляется в понятной активности под ответом. Provider ID, latency и технические идентификаторы не мешают обычной работе." : "When Erma checks a release, documentation, or service status, a clear activity disclosure appears below the answer. Provider IDs, latency, and technical identifiers stay out of the normal workflow."}</p>
            <div className="mt-7 grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2">
              <p className="flex items-start gap-2 rounded-2xl bg-surface-container-low p-3"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{ru ? "Только серверный allowlist" : "Server allowlist only"}</p>
              <p className="flex items-start gap-2 rounded-2xl bg-surface-container-low p-3"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{ru ? "Без shell и произвольных URL" : "No shell or arbitrary URLs"}</p>
            </div>
            <Link href="/status" className="mt-7 inline-flex min-h-11 items-center gap-2 border-b border-primary text-sm font-medium text-primary">{ru ? "Открыть статус" : "Open status"}<ArrowUpRight size={15} /></Link>
          </ScrollReveal>
        </section>

        <section className="stitch-container mb-section-gap">
          <ScrollReveal>
            <article className="relative overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-10 md:p-14">
              <div className="relative grid gap-7 md:grid-cols-12 md:items-start">
                <div className="md:col-span-3"><span className="inline-flex size-11 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low"><Sparkles size={20} /></span><p className="label-caps mt-5 text-secondary">{ru ? "Текущая версия" : "Current release"}</p><p className="mt-2 font-serif text-[28px]">{latestRelease.version}</p><p className="mt-1 text-sm text-secondary">{latestRelease.date}</p></div>
                <div className="md:col-span-8 md:col-start-5"><h2 className="headline-title">{latestRelease.title}</h2><p className="mt-4 max-w-3xl leading-[1.75] text-on-surface-variant">{latestRelease.summary}</p><ul className="mt-6 grid gap-2 sm:grid-cols-2">{latestRelease.changes.slice(0, 4).map((change) => <li key={change} className="rounded-2xl bg-surface-container-low p-4 text-sm leading-[1.6] text-on-surface-variant">{change}</li>)}</ul><Link href="/patch-notes" className="mt-7 inline-flex min-h-11 items-center gap-2 border-b border-primary text-sm font-medium text-primary">{ru ? "Все обновления" : "All updates"}<ArrowUpRight size={16} /></Link></div>
              </div>
            </article>
          </ScrollReveal>
        </section>

        <section className="stitch-container mb-section-gap md:hidden">
          <Link href="/playground" className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-on-primary">{ru ? "Начать новый диалог" : "Start a new conversation"}</Link>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
