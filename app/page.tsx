import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FolderClock, Sparkles, Wrench } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getCurrentRelease } from "@/lib/current-release";
import { getLocale } from "@/lib/locale";

const HERO_IMAGE = "/images/home/hero-editorial.jpg";
const LAB_MONOLITH_IMAGE = "/images/home/lab-monolith.jpg";
const LAB_PRECISION_IMAGE = "/images/home/lab-precision.jpg";

export default async function HomePage() {
  const locale = await getLocale();
  const ru = locale === "ru";
  const latestRelease = getCurrentRelease(locale);
  const capabilities = ru
    ? [
        {
          title: "Erma · Auto",
          text: "Автоматический выбор между Lite, Core и Pro в зависимости от сложности задачи.",
          icon: Sparkles,
        },
        {
          title: "Безопасные инструменты",
          text: "Документация, релизы, системный статус, вычисления и история — только в режиме read-only.",
          icon: Wrench,
        },
        {
          title: "Локальное хранение",
          text: "Диалоги, проекты, ветки, версии ответов и черновики сохраняются на текущем устройстве.",
          icon: FolderClock,
        },
      ]
    : [
        {
          title: "Erma · Auto",
          text: "Automatic routing between Lite, Core, and Pro based on task complexity.",
          icon: Sparkles,
        },
        {
          title: "Safe tools",
          text: "Documentation, releases, system status, calculations, and history operate in read-only mode.",
          icon: Wrench,
        },
        {
          title: "Local storage",
          text: "Conversations, projects, branches, answer versions, and drafts remain stored on this device.",
          icon: FolderClock,
        },
      ];

  return (
    <>
      <StitchHeader active="home" />
      <main>
        {/* Desktop Surface */}
        <div className="hidden lg:block" data-device-version="desktop" data-home-surface="desktop">
          {/* Hero Section */}
          <section className="stitch-container mb-section-gap mt-10 grid items-center gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-14">
            <ScrollReveal className="space-y-6 lg:col-span-6 lg:space-y-8">
              <p className="label-caps text-secondary">TK LAB · ERMA</p>
              <h1 className="display-title max-w-2xl">
                {ru ? "AI-среда для прикладной работы" : "AI workspace for focused work"}
              </h1>
              <p className="max-w-xl text-[17px] leading-[1.8] text-on-surface-variant">
                {ru
                  ? "Работа с моделями, документами и локальными проектами."
                  : "Work with models, documents, and local projects."}
              </p>
              <div className="pt-2">
                <Link
                  href="/models"
                  className="group inline-flex min-h-11 items-center gap-2 border-b border-primary text-sm font-medium text-primary transition-opacity hover:opacity-75"
                >
                  {ru ? "О моделях Erma" : "About Erma models"}
                  <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.12} className="lg:col-span-6">
              <div className="group relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest shadow-[0_20px_50px_rgba(0,0,0,0.06)] lg:min-h-[460px] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                <Image
                  src={HERO_IMAGE}
                  alt={ru ? "Лаборатория TK LAB" : "TK LAB workspace"}
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
              </div>
            </ScrollReveal>
          </section>

          {/* Core Capabilities */}
          <section className="stitch-container mb-section-gap">
            <ScrollReveal>
              <div className="mb-8 border-b border-outline-variant/30 pb-6 sm:mb-12">
                <p className="label-caps mb-3 text-secondary">{ru ? "Архитектура" : "Architecture"}</p>
                <h2 className="headline-title">{ru ? "Структура рабочей среды" : "Workspace structure"}</h2>
              </div>
            </ScrollReveal>

            <StaggerContainer className="grid gap-4 md:grid-cols-3" staggerDelay={0.08}>
              {capabilities.map(({ title, text, icon: Icon }) => (
                <StaggerItem key={title}>
                  <article className="group flex h-full flex-col justify-between rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] sm:p-8">
                    <div>
                      <span className="grid size-11 place-items-center rounded-2xl border border-outline-variant/40 bg-surface-container-low text-primary">
                        <Icon size={19} />
                      </span>
                      <h3 className="mt-8 font-serif text-[26px] leading-snug text-primary">{title}</h3>
                      <p className="mt-4 leading-[1.75] text-on-surface-variant">{text}</p>
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>

          {/* Verifiable Work / Infrastructure */}
          <section className="stitch-container mb-section-gap grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <ScrollReveal className="lg:col-span-6">
              <div className="group relative aspect-[16/11] overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                <Image
                  src={LAB_MONOLITH_IMAGE}
                  alt={ru ? "Инфраструктура TK Lab" : "TK Lab infrastructure"}
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.12} className="space-y-6 rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest p-8 sm:p-10 lg:col-span-6">
              <p className="label-caps text-secondary">{ru ? "Инструменты" : "Tools"}</p>
              <h2 className="headline-title">{ru ? "Инструменты видны, инфраструктура изолирована" : "Tools are visible; infrastructure stays isolated"}</h2>
              <p className="leading-[1.8] text-on-surface-variant">
                {ru
                  ? "При обращении к обновлениям, документации или статусу вызов инструмента отображается в ответе. Все запросы проходят через серверный allowlist."
                  : "When checking releases, documentation, or service status, tool activity appears directly below the answer. All requests use a server allowlist."}
              </p>
              <div className="grid gap-3 pt-2 text-sm text-on-surface-variant sm:grid-cols-2">
                <p className="flex items-start gap-2.5 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>{ru ? "Только серверный allowlist" : "Server allowlist only"}</span>
                </p>
                <p className="flex items-start gap-2.5 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>{ru ? "Без shell и произвольных URL" : "No shell or arbitrary URLs"}</span>
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/status"
                  className="group inline-flex min-h-11 items-center gap-2 border-b border-primary text-sm font-medium text-primary transition-opacity hover:opacity-75"
                >
                  {ru ? "Открыть статус" : "Open status"}
                  <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </ScrollReveal>
          </section>

          {/* Current Release Section */}
          <section className="stitch-container mb-section-gap">
            <ScrollReveal>
              <article className="relative overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest p-8 sm:p-10 md:p-14">
                <div className="relative grid gap-10 md:grid-cols-12 md:items-start">
                  <div className="space-y-6 md:col-span-4">
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-outline-variant/50 bg-surface-container-low text-primary">
                      <Sparkles size={20} />
                    </span>
                    <div>
                      <p className="label-caps text-secondary">{ru ? "Текущая версия" : "Current release"}</p>
                      <p className="mt-2 break-words font-serif text-[32px] text-primary">{latestRelease.version}</p>
                      <p className="mt-1 text-xs font-mono text-secondary">{latestRelease.date}</p>
                    </div>

                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-outline-variant/40">
                      <Image
                        src={LAB_PRECISION_IMAGE}
                        alt={ru ? "Аппаратная точность" : "Hardware precision"}
                        fill
                        loading="lazy"
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 md:col-span-8 md:col-start-5">
                    <h2 className="headline-title text-[30px] md:text-[34px]">{latestRelease.title}</h2>
                    <p className="max-w-3xl leading-[1.8] text-on-surface-variant">{latestRelease.summary}</p>
                    <ul className="grid gap-2.5 sm:grid-cols-2">
                      {latestRelease.changes.slice(0, 4).map((change) => (
                        <li key={change} className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 text-sm leading-[1.65] text-on-surface-variant">
                          {change}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2">
                      <Link
                        href="/patch-notes"
                        className="group inline-flex min-h-11 items-center gap-2 border-b border-primary text-sm font-medium text-primary transition-opacity hover:opacity-75"
                      >
                        {ru ? "Все обновления" : "All updates"}
                        <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          </section>
        </div>

        {/* Mobile Surface */}
        <div className="lg:hidden" data-device-version="mobile" data-home-surface="mobile">
          {/* Mobile Hero */}
          <section className="stitch-container mb-14 mt-6">
            <p className="label-caps text-secondary">TK LAB · ERMA</p>
            <h1 className="mt-4 font-serif text-[38px] font-normal leading-[1.1] tracking-[-0.02em] text-primary">
              {ru ? "AI-среда для прикладной работы" : "AI workspace for focused work"}
            </h1>
            <p className="mt-4 text-[16px] leading-[1.75] text-on-surface-variant">
              {ru
                ? "Работа с моделями, документами и локальными проектами."
                : "Work with models, documents, and local projects."}
            </p>
            <div className="mt-5">
              <Link href="/models" className="inline-flex min-h-11 items-center gap-1 border-b border-primary text-sm font-medium text-primary">
                {ru ? "О моделях Erma" : "About Erma models"}
                <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="relative mt-7 aspect-[16/11] overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
              <Image
                src={HERO_IMAGE}
                alt={ru ? "Лаборатория TK LAB" : "TK LAB workspace"}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </section>

          {/* Mobile Core Capabilities */}
          <section className="stitch-container mb-14">
            <div className="mb-6 border-b border-outline-variant/30 pb-4">
              <p className="label-caps mb-2 text-secondary">{ru ? "Архитектура" : "Architecture"}</p>
              <h2 className="font-serif text-[28px] font-normal leading-[1.2] text-primary">
                {ru ? "Структура рабочей среды" : "Workspace structure"}
              </h2>
            </div>
            <div className="grid gap-3">
              {capabilities.map(({ title, text, icon: Icon }) => (
                <article key={title} className="rounded-3xl border border-outline-variant/60 bg-surface-container-lowest p-5">
                  <span className="grid size-10 place-items-center rounded-2xl border border-outline-variant/40 bg-surface-container-low text-primary">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-4 font-serif text-[22px] text-primary">{title}</h3>
                  <p className="mt-2.5 text-sm leading-[1.7] text-on-surface-variant">{text}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Mobile Verifiable Work */}
          <section className="stitch-container mb-14">
            <div className="relative aspect-[16/11] overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
              <Image
                src={LAB_MONOLITH_IMAGE}
                alt={ru ? "Рабочая среда TK Lab" : "TK Lab workspace"}
                fill
                loading="lazy"
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <article className="mt-4 rounded-3xl border border-outline-variant/60 bg-surface-container-lowest p-5">
              <p className="label-caps text-secondary">{ru ? "Инструменты" : "Tools"}</p>
              <h2 className="mt-3 font-serif text-[26px] font-normal leading-[1.2] text-primary">
                {ru ? "Инструменты видны, инфраструктура изолирована" : "Tools are visible; infrastructure stays isolated"}
              </h2>
              <p className="mt-3 text-sm leading-[1.75] text-on-surface-variant">
                {ru
                  ? "При обращении к обновлениям, документации или статусу вызов инструмента отображается в ответе. Все запросы проходят через серверный allowlist."
                  : "When checking releases, documentation, or service status, tool activity appears directly below the answer. All requests use a server allowlist."}
              </p>
              <div className="mt-4 grid gap-2 text-xs text-on-surface-variant">
                <p className="flex items-start gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                  <span>{ru ? "Только серверный allowlist" : "Server allowlist only"}</span>
                </p>
                <p className="flex items-start gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                  <span>{ru ? "Без shell и произвольных URL" : "No shell or arbitrary URLs"}</span>
                </p>
              </div>
              <div className="mt-5">
                <Link href="/status" className="inline-flex min-h-11 items-center gap-2 border-b border-primary text-sm font-medium text-primary">
                  {ru ? "Открыть статус" : "Open status"}
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          </section>

          {/* Mobile Current Release */}
          <section className="stitch-container mb-section-gap">
            <article className="rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest p-5">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-outline-variant/50 bg-surface-container-low text-primary">
                  <Sparkles size={18} />
                </span>
                <div className="min-w-0">
                  <p className="label-caps text-secondary">{ru ? "Текущая версия" : "Current release"}</p>
                  <p className="mt-1 break-words font-serif text-[24px] text-primary">{latestRelease.version}</p>
                  <p className="text-xs font-mono text-secondary">{latestRelease.date}</p>
                </div>
              </div>
              <h2 className="mt-5 font-serif text-[26px] font-normal leading-[1.2] text-primary">{latestRelease.title}</h2>
              <p className="mt-3 text-sm leading-[1.75] text-on-surface-variant">{latestRelease.summary}</p>
              <ul className="mt-4 grid gap-2">
                {latestRelease.changes.slice(0, 3).map((change) => (
                  <li key={change} className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-3 text-xs leading-[1.65] text-on-surface-variant">
                    {change}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Link href="/patch-notes" className="inline-flex min-h-11 items-center gap-2 border-b border-primary text-sm font-medium text-primary">
                  {ru ? "Все обновления" : "All updates"}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </article>
          </section>
        </div>
      </main>
      <StitchFooter />
    </>
  );
}
