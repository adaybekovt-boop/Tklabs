import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ArrowUpRight, Bot, Boxes, Globe2, Newspaper, ShieldCheck } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { FlowButton } from "@/components/ui/flow-button";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "TK LAB — Documentation",
  description: "API, models, access, product behavior, and system principles.",
};

export default async function DocumentationPage() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const ru = locale === "ru";

  const startHere = ru
    ? [
        { href: "/playground", title: "AI-чат", description: "Как начать диалог, выбрать режим Erma и работать с локальной историей.", icon: Bot },
        { href: "/models", title: "Модели", description: "Что делает Erma Auto и чем отличаются доступные режимы.", icon: Boxes },
        { href: "/patch-notes", title: "Обновления", description: "Что изменилось в последних патчах и какие исправления уже в production.", icon: Newspaper },
        { href: "/status", title: "Статус", description: "Текущее состояние сайта, AI-провайдеров и ключевых сервисов.", icon: Activity },
      ]
    : [
        { href: "/playground", title: "AI chat", description: "Start a conversation, understand Erma modes, and work with local history.", icon: Bot },
        { href: "/models", title: "Models", description: "How Erma Auto works and how the available modes differ.", icon: Boxes },
        { href: "/patch-notes", title: "Updates", description: "See what changed in recent patches and what is already in production.", icon: Newspaper },
        { href: "/status", title: "Status", description: "Check the current state of the site, AI providers, and critical services.", icon: Activity },
      ];

  const trustLinks = ru
    ? [
        { href: "/legal/terms", title: "Пользовательское соглашение", description: "Актуальная версия условий и правила использования.", icon: ShieldCheck },
        { href: "/legal/privacy", title: "Конфиденциальность", description: "Какие данные используются и где проходит граница локального и серверного хранения.", icon: ShieldCheck },
        { href: "/supported-countries", title: "Поддерживаемые страны", description: "Географические ограничения доступа и статус Казахстана.", icon: Globe2 },
      ]
    : [
        { href: "/legal/terms", title: "Terms of use", description: "The current agreement version and the rules for using TK LAB.", icon: ShieldCheck },
        { href: "/legal/privacy", title: "Privacy", description: "What data is used and where local storage ends and server processing begins.", icon: ShieldCheck },
        { href: "/supported-countries", title: "Supported countries", description: "Geographic access restrictions and Kazakhstan support status.", icon: Globe2 },
      ];

  return (
    <>
      <StitchHeader active="documentation" />
      <main className="stitch-container py-section-gap">
        <section className="mb-section-gap grid gap-12 border-b border-outline-variant/30 pb-16 md:grid-cols-12">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-7 text-secondary">{text.documentation.eyebrow}</p>
            <h1 className="display-title">{text.documentation.title}</h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">
            {text.documentation.intro}
          </ScrollReveal>
        </section>

        <section className="mb-section-gap" aria-labelledby="docs-start-here">
          <ScrollReveal>
            <div className="mb-7 sm:mb-10">
              <p className="label-caps text-secondary">{ru ? "Быстрый вход" : "Start here"}</p>
              <h2 id="docs-start-here" className="headline-title mt-3">{ru ? "Найдите нужный раздел за один переход" : "Reach the right section in one step"}</h2>
            </div>
          </ScrollReveal>
          <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.07}>
            {startHere.map(({ href, title, description, icon: Icon }) => (
              <StaggerItem key={href}>
                <Link href={href} className="editorial-card group block h-full rounded-3xl border border-outline-variant bg-surface-container-lowest p-6">
                  <span className="grid size-11 place-items-center rounded-2xl bg-surface-container-low text-primary"><Icon size={19} aria-hidden="true" /></span>
                  <h3 className="mt-7 font-serif text-[25px] text-primary">{title}</h3>
                  <p className="mt-3 text-sm leading-[1.65] text-on-surface-variant">{description}</p>
                  <ArrowUpRight size={16} className="mt-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true" />
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <section className="mb-section-gap" aria-labelledby="docs-reference">
          <ScrollReveal>
            <p className="label-caps text-secondary">{ru ? "Справочник" : "Reference"}</p>
            <h2 id="docs-reference" className="headline-title mt-3 mb-8">{ru ? "Подробная документация платформы" : "Detailed platform documentation"}</h2>
          </ScrollReveal>
          <StaggerContainer className="grid gap-4 md:grid-cols-2" staggerDelay={0.1}>
            {text.documentation.documents.map((document) => (
              <StaggerItem key={document.href}>
                <Link href={document.href} className="editorial-card group block overflow-hidden rounded-2xl border border-outline-variant bg-white p-8 transition-colors hover:border-primary md:p-10">
                  <div className="flex items-start justify-between gap-4">
                    <span className="label-caps text-secondary">{document.label}</span>
                    <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                  <h3 className="mt-12 font-serif text-[30px]">{document.title}</h3>
                  <p className="mt-4 max-w-lg leading-[1.7] text-on-surface-variant">{document.description}</p>
                  <span className="label-caps mt-10 inline-block border-b border-primary pb-1">{text.documentation.openSection}</span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <section className="mb-section-gap rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:p-9" aria-labelledby="docs-trust">
          <ScrollReveal>
            <p className="label-caps text-secondary">{ru ? "Доверие и правила" : "Trust and policy"}</p>
            <h2 id="docs-trust" className="headline-title mt-3">{ru ? "Условия, приватность и география доступа" : "Terms, privacy, and access geography"}</h2>
            <p className="mt-4 max-w-3xl leading-[1.7] text-on-surface-variant">
              {ru
                ? "Эти страницы являются частью продуктовой документации: по ним можно проверить актуальные правила до входа и в любой момент после авторизации."
                : "These pages are part of the product documentation so the current rules remain accessible before sign-in and at any time after authentication."}
            </p>
          </ScrollReveal>
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            {trustLinks.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary">
                <Icon size={18} aria-hidden="true" />
                <h3 className="mt-5 font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-[1.6] text-on-surface-variant">{description}</p>
              </Link>
            ))}
          </div>
        </section>

        <ScrollReveal>
          <section className="overflow-hidden rounded-3xl border border-primary bg-white p-8 sm:p-10 md:p-14">
            <div className="grid gap-8 md:grid-cols-12 md:items-center">
              <div className="md:col-span-7">
                <p className="label-caps mb-5 text-secondary">{text.documentation.quickStart}</p>
                <h2 className="headline-title">{text.documentation.quickTitle}</h2>
                <p className="mt-4 max-w-2xl leading-[1.7] text-on-surface-variant">
                  {ru
                    ? "Если задача практическая, откройте AI-чат. Для проверки изменений, ограничений или поведения платформы сначала используйте Обновления, Статус и разделы выше."
                    : "For practical work, open AI chat. To verify changes, restrictions, or platform behavior first use Updates, Status, and the reference sections above."}
                </p>
              </div>
              <div className="md:col-span-4 md:col-start-9">
                <FlowButton href="/playground" text={text.documentation.openLab} dark className="w-full" />
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>
      <StitchFooter />
    </>
  );
}
