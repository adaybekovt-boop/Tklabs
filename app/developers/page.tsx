import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Braces,
  CheckCircle2,
  CloudCog,
  Gauge,
  GitPullRequestArrow,
  Layers3,
  RefreshCcw,
  Route,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getLocale } from "@/lib/locale";
import { CURRENT_RELEASE_VERSION } from "@/lib/release-version";

export const metadata: Metadata = {
  title: "TK LAB — Developers",
  description: "Engineering ownership, backend reliability, product architecture, and the people responsible for TK LAB.",
};

export default async function DevelopersPage() {
  const locale = await getLocale();
  const ui = locale === "ru"
    ? {
        eyebrow: "Разработчики / Engineering ownership",
        title: "Люди, которые отвечают за качество системы.",
        intro: "TK Labs развивается не как набор отдельных экранов, а как единая рабочая платформа. Здесь зафиксированы реальные зоны ответственности: backend, отказоустойчивость, AI-системы, продуктовая архитектура и качество релизов.",
        currentRelease: "Текущий цикл",
        ownership: "Зоны ответственности",
        ownershipIntro: "Каждое направление имеет понятного владельца. Это снижает размытость решений и помогает быстрее разбирать ошибки, деградации и спорные изменения.",
        tkRole: "Backend, качество и отказоустойчивость",
        tkSummary: "TK отвечает за backend-платформу TK Labs, качество релизов и способность системы продолжать работу при сбоях внешних сервисов.",
        tkResponsibilities: [
          "Backend и Cloudflare Worker runtime",
          "Отказоустойчивость, fallback-маршруты и восстановление",
          "CI/CD, release gates и production-проверки",
          "Авторизация, D1, Durable Objects и серверные политики",
          "Производительность, наблюдаемость и разбор инцидентов",
        ],
        thomasRole: "Product architecture и AI systems",
        thomasSummary: "THOMAS TM отвечает за продуктовую архитектуру, поведение AI-систем и целостность пользовательского опыта от модели до интерфейса.",
        thomasResponsibilities: [
          "Архитектура продукта и рабочие сценарии",
          "Модельные маршруты, Erma и Agent workflows",
          "Информационная архитектура и интерфейсные системы",
          "Функциональное направление и качество взаимодействия",
          "Связь AI-возможностей с понятным продуктовым результатом",
        ],
        lead: "Владелец направления",
        responsibilities: "Отвечает за",
        operatingModel: "Как мы выпускаем изменения",
        operatingIntro: "Отказоустойчивость начинается до production. Каждый патч должен пройти одинаковую последовательность проверки, безопасной деградации и наблюдения после выкладки.",
        stages: [
          ["01", "Проверить", "TypeScript, lint, unit и integration-контракты должны остановить несовместимое изменение до сборки."],
          ["02", "Собрать", "Production Worker собирается воспроизводимо из lockfile и проходит performance budget и dry-run."],
          ["03", "Деградировать безопасно", "Сбой внешней модели не должен уничтожать запрос, локальные данные или весь интерфейс."],
          ["04", "Проверить production", "Readiness endpoint и smoke-test подтверждают, что развернулась нужная версия и обязательные bindings доступны."],
          ["05", "Разобрать", "Ошибки получают request ID, понятную классификацию и путь к восстановлению без раскрытия секретов."],
        ],
        principles: "Инженерные принципы",
        principlesIntro: "Надёжность — это не обещание абсолютного отсутствия ошибок. Это способность ограничить сбой, сохранить данные и вернуть систему в рабочее состояние.",
        principleCards: [
          ["Bounded failure", "Один provider или один экран не должен обрушать всю рабочую среду."],
          ["Last known good", "Кэш и сохранённое состояние используются только с явной маркировкой stale и ограниченным сроком."],
          ["Release evidence", "Версия, cache namespace, документация и production-проверка обновляются одним патчем."],
          ["Clear ownership", "Backend и отказоустойчивость имеют конкретного владельца, а не распределены абстрактно между всей командой."],
        ],
        systemMap: "Карта инженерной системы",
        systemMapIntro: "Основные слои TK Labs и ответственность за их устойчивую совместную работу.",
        layers: [
          ["Edge runtime", "Cloudflare Worker, bindings, Durable Objects и D1", "TK"],
          ["AI routing", "NVIDIA, Clodex, fallback policy и Erma modes", "TK × THOMAS"],
          ["Workspace", "Chat, Flow, artifacts, local archive и Vault", "THOMAS × TK"],
          ["Release system", "CI, smoke tests, cache bump и production validation", "TK"],
        ],
        liveStatus: "Открыть статус",
        releases: "История релизов",
        documentation: "Документация",
        finalTitle: "Качество — часть архитектуры.",
        finalText: "Мы рассматриваем отказоустойчивость, backend и интерфейс как одну систему. Поэтому новые функции не считаются готовыми, пока для них не определены ограничения, fallback-поведение, проверка и владелец.",
      }
    : {
        eyebrow: "Developers / Engineering ownership",
        title: "The people accountable for system quality.",
        intro: "TK Labs is developed as one working platform rather than a collection of isolated screens. This page records clear ownership across backend, resilience, AI systems, product architecture, and release quality.",
        currentRelease: "Current cycle",
        ownership: "Ownership areas",
        ownershipIntro: "Every engineering direction has a visible owner. This reduces ambiguous decisions and makes failures, degradations, and disputed changes easier to resolve.",
        tkRole: "Backend, quality, and reliability",
        tkSummary: "TK owns the TK Labs backend platform, release quality, and the system's ability to continue operating when external services fail.",
        tkResponsibilities: [
          "Backend and Cloudflare Worker runtime",
          "Resilience, fallback routes, and recovery",
          "CI/CD, release gates, and production validation",
          "Authentication, D1, Durable Objects, and server policies",
          "Performance, observability, and incident analysis",
        ],
        thomasRole: "Product architecture and AI systems",
        thomasSummary: "THOMAS TM owns product architecture, AI-system behavior, and the coherence of the user experience from model routing to interface.",
        thomasResponsibilities: [
          "Product architecture and working flows",
          "Model routing, Erma, and agent workflows",
          "Information architecture and interface systems",
          "Functional direction and interaction quality",
          "Turning AI capabilities into understandable product outcomes",
        ],
        lead: "Area owner",
        responsibilities: "Responsible for",
        operatingModel: "How changes reach production",
        operatingIntro: "Reliability starts before production. Every patch follows the same sequence of validation, safe degradation, and post-deployment verification.",
        stages: [
          ["01", "Validate", "TypeScript, lint, unit, and integration contracts stop incompatible changes before the build."],
          ["02", "Build", "The production Worker is reproduced from the lockfile and passes the performance budget and dry-run."],
          ["03", "Degrade safely", "An external-model failure must not destroy the request, local data, or the entire interface."],
          ["04", "Verify production", "A readiness endpoint and smoke test confirm that the expected release and required bindings are live."],
          ["05", "Resolve", "Failures receive a request ID, clear classification, and a recovery path without exposing secrets."],
        ],
        principles: "Engineering principles",
        principlesIntro: "Reliability does not mean promising that failures never happen. It means containing them, preserving data, and returning the system to a working state.",
        principleCards: [
          ["Bounded failure", "One provider or one screen must not take down the complete workspace."],
          ["Last known good", "Cached and retained state is used only with an explicit stale marker and a bounded lifetime."],
          ["Release evidence", "Version, cache namespace, documentation, and production validation move together in one patch."],
          ["Clear ownership", "Backend and reliability have a named owner instead of being abstractly shared by the whole team."],
        ],
        systemMap: "Engineering system map",
        systemMapIntro: "The primary TK Labs layers and ownership for keeping them working together.",
        layers: [
          ["Edge runtime", "Cloudflare Worker, bindings, Durable Objects, and D1", "TK"],
          ["AI routing", "NVIDIA, Clodex, fallback policy, and Erma modes", "TK × THOMAS"],
          ["Workspace", "Chat, Flow, artifacts, local archive, and Vault", "THOMAS × TK"],
          ["Release system", "CI, smoke tests, cache bump, and production validation", "TK"],
        ],
        liveStatus: "Open status",
        releases: "Release history",
        documentation: "Documentation",
        finalTitle: "Quality is part of the architecture.",
        finalText: "We treat resilience, backend, and interface as one system. A feature is not complete until its limits, fallback behavior, validation, and owner are defined.",
      };

  const people = [
    {
      name: "TK",
      role: ui.tkRole,
      summary: ui.tkSummary,
      responsibilities: ui.tkResponsibilities,
      image: "/images/developers/tk.jpg",
      icon: ShieldCheck,
      accent: "bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,.22),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(123,97,255,.18),transparent_38%)]",
    },
    {
      name: "THOMAS TM",
      role: ui.thomasRole,
      summary: ui.thomasSummary,
      responsibilities: ui.thomasResponsibilities,
      image: "/images/developers/thomas-tm.jpg",
      icon: Sparkles,
      accent: "bg-[radial-gradient(circle_at_15%_0%,rgba(234,179,8,.18),transparent_42%),radial-gradient(circle_at_90%_20%,rgba(244,114,182,.14),transparent_36%)]",
    },
  ];

  const layerIcons = [CloudCog, Route, Layers3, GitPullRequestArrow];
  const principleIcons = [ShieldCheck, RefreshCcw, CheckCircle2, Gauge];

  return (
    <>
      <StitchHeader active="developers" />
      <main className="stitch-container pb-section-gap pt-8 sm:pt-12 md:pt-16">
        <section className="relative mb-12 overflow-hidden rounded-[2.25rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_30px_90px_rgba(15,23,42,.08)] sm:p-9 md:mb-section-gap md:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(59,130,246,.18),transparent_34%),radial-gradient(circle_at_92%_0%,rgba(123,97,255,.18),transparent_36%)]" />
          <div className="relative grid gap-10 md:grid-cols-12 md:items-end">
            <ScrollReveal className="md:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <p className="label-caps text-secondary">{ui.eyebrow}</p>
                <span className="rounded-full border border-outline-variant bg-surface/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
                  {ui.currentRelease} · {CURRENT_RELEASE_VERSION}
                </span>
              </div>
              <h1 className="display-title mt-6 max-w-5xl">{ui.title}</h1>
            </ScrollReveal>
            <ScrollReveal delay={0.12} className="md:col-span-4">
              <p className="border-l-2 border-primary pl-5 text-[16px] leading-[1.75] text-on-surface-variant sm:text-[18px]">{ui.intro}</p>
            </ScrollReveal>
          </div>

          <StaggerContainer className="relative mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-developer-system-summary>
            {[
              [ServerCog, "Backend", "Cloudflare · D1 · Durable Objects"],
              [ShieldCheck, locale === "ru" ? "Надёжность" : "Reliability", "Fallback · recovery · readiness"],
              [Braces, "AI systems", "Erma · routing · tools"],
              [Boxes, locale === "ru" ? "Продукт" : "Product", "Workspace · interface · flows"],
            ].map(([Icon, title, text]) => (
              <StaggerItem key={String(title)}>
                <div className="h-full rounded-2xl border border-outline-variant bg-surface/82 p-4 backdrop-blur-sm">
                  <Icon size={18} aria-hidden="true" className="text-primary" />
                  <p className="mt-5 text-sm font-semibold text-primary">{String(title)}</p>
                  <p className="mt-1 text-xs leading-[1.5] text-on-surface-variant">{String(text)}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <section className="mb-section-gap" aria-labelledby="engineering-ownership-title" data-developer-ownership>
          <ScrollReveal>
            <div className="mb-8 grid gap-5 border-b border-outline-variant pb-7 md:grid-cols-12 md:items-end">
              <div className="md:col-span-5">
                <p className="label-caps text-secondary">01 / Ownership</p>
                <h2 id="engineering-ownership-title" className="headline-title mt-4">{ui.ownership}</h2>
              </div>
              <p className="leading-[1.7] text-on-surface-variant md:col-span-6 md:col-start-7">{ui.ownershipIntro}</p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid gap-4 lg:grid-cols-2">
            {people.map((person, index) => {
              const Icon = person.icon;
              return (
                <StaggerItem key={person.name}>
                  <article className="group relative h-full overflow-hidden rounded-[2rem] border border-outline-variant bg-surface-container-lowest shadow-[0_22px_70px_rgba(15,23,42,.07)]">
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-60 ${person.accent}`} />
                    <div className="relative grid gap-0 sm:grid-cols-[minmax(190px,.82fr)_1.18fr]">
                      <div className="relative min-h-[330px] overflow-hidden sm:min-h-full">
                        <Image
                          src={person.image}
                          alt={`${person.name} portrait`}
                          fill
                          sizes="(min-width: 1024px) 24vw, (min-width: 640px) 38vw, 100vw"
                          className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.025]"
                          priority={index === 0}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                        <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-black/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                          {ui.lead}
                        </span>
                      </div>

                      <div className="relative p-5 sm:p-7">
                        <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-5">
                          <div>
                            <p className="label-caps text-secondary">0{index + 1} / TK LAB</p>
                            <h3 className="mt-3 font-serif text-[34px] leading-none text-primary sm:text-[40px]">{person.name}</h3>
                          </div>
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-outline-variant bg-surface text-primary">
                            <Icon size={19} aria-hidden="true" />
                          </span>
                        </div>

                        <p className="mt-5 text-sm font-semibold leading-[1.45] text-primary">{person.role}</p>
                        <p className="mt-3 text-sm leading-[1.7] text-on-surface-variant">{person.summary}</p>

                        <p className="label-caps mt-7 text-secondary">{ui.responsibilities}</p>
                        <ul className="mt-3 space-y-2.5">
                          {person.responsibilities.map((responsibility) => (
                            <li key={responsibility} className="flex items-start gap-2.5 text-sm leading-[1.55] text-on-surface-variant">
                              <CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                              <span>{responsibility}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </section>

        <section className="mb-section-gap grid gap-5 lg:grid-cols-[.9fr_1.1fr]" data-resilience-principles>
          <ScrollReveal>
            <article className="h-full rounded-[2rem] border border-outline-variant bg-primary p-6 text-on-primary sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-primary/65">02 / Release discipline</p>
              <h2 className="mt-5 font-serif text-[38px] leading-[1.05] sm:text-[46px]">{ui.operatingModel}</h2>
              <p className="mt-5 max-w-xl leading-[1.75] text-on-primary/72">{ui.operatingIntro}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Link href="/status" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/18">
                  <Activity size={15} aria-hidden="true" /> {ui.liveStatus}
                </Link>
                <Link href="/patch-notes" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10">
                  {ui.releases}<ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <ol className="overflow-hidden rounded-[2rem] border border-outline-variant bg-surface-container-lowest">
              {ui.stages.map(([number, title, description], index) => (
                <li key={number} className="grid gap-3 border-b border-outline-variant p-5 last:border-b-0 sm:grid-cols-[64px_150px_1fr] sm:items-start sm:p-6">
                  <span className="font-mono text-xs font-semibold text-secondary">{number}</span>
                  <span className="text-sm font-semibold text-primary">{title}</span>
                  <span className="text-sm leading-[1.65] text-on-surface-variant">{description}</span>
                  {index < ui.stages.length - 1 ? <span className="hidden" aria-hidden="true" /> : null}
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </section>

        <section className="mb-section-gap" aria-labelledby="engineering-principles-title">
          <ScrollReveal>
            <div className="mb-8 grid gap-5 border-b border-outline-variant pb-7 md:grid-cols-12 md:items-end">
              <div className="md:col-span-5">
                <p className="label-caps text-secondary">03 / Reliability model</p>
                <h2 id="engineering-principles-title" className="headline-title mt-4">{ui.principles}</h2>
              </div>
              <p className="leading-[1.7] text-on-surface-variant md:col-span-6 md:col-start-7">{ui.principlesIntro}</p>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ui.principleCards.map(([title, description], index) => {
              const Icon = principleIcons[index];
              return (
                <StaggerItem key={title}>
                  <article className="h-full rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 transition-transform duration-200 hover:-translate-y-1">
                    <span className="grid size-11 place-items-center rounded-2xl bg-surface-container-low text-primary"><Icon size={18} aria-hidden="true" /></span>
                    <h3 className="mt-6 text-base font-semibold text-primary">{title}</h3>
                    <p className="mt-3 text-sm leading-[1.65] text-on-surface-variant">{description}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </section>

        <section className="mb-section-gap overflow-hidden rounded-[2rem] border border-outline-variant bg-surface-container-lowest" aria-labelledby="system-map-title" data-engineering-system-map>
          <ScrollReveal>
            <div className="grid gap-5 border-b border-outline-variant p-6 md:grid-cols-12 md:items-end md:p-8">
              <div className="md:col-span-5">
                <p className="label-caps text-secondary">04 / System map</p>
                <h2 id="system-map-title" className="headline-title mt-4">{ui.systemMap}</h2>
              </div>
              <p className="leading-[1.7] text-on-surface-variant md:col-span-6 md:col-start-7">{ui.systemMapIntro}</p>
            </div>
          </ScrollReveal>
          <div className="divide-y divide-outline-variant">
            {ui.layers.map(([name, description, owner], index) => {
              const Icon = layerIcons[index];
              return (
                <ScrollReveal key={name} delay={index * 0.04}>
                  <div className="grid gap-4 p-5 sm:grid-cols-[52px_160px_1fr_auto] sm:items-center sm:p-6">
                    <span className="grid size-11 place-items-center rounded-2xl border border-outline-variant bg-surface text-primary"><Icon size={18} aria-hidden="true" /></span>
                    <span className="text-sm font-semibold text-primary">{name}</span>
                    <span className="text-sm leading-[1.6] text-on-surface-variant">{description}</span>
                    <span className="w-fit rounded-full border border-outline-variant bg-surface-container-low px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">{owner}</span>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        <ScrollReveal>
          <section className="relative overflow-hidden rounded-[2.25rem] border border-outline-variant bg-surface-container-low p-6 sm:p-9 md:p-12">
            <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border border-primary/10" />
            <div className="pointer-events-none absolute -right-4 -top-8 size-36 rounded-full border border-primary/10" />
            <div className="relative grid gap-8 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <p className="label-caps text-secondary">TK LAB / Engineering</p>
                <h2 className="mt-5 font-serif text-[40px] leading-[1.05] text-primary sm:text-[52px]">{ui.finalTitle}</h2>
                <p className="mt-5 max-w-2xl leading-[1.75] text-on-surface-variant">{ui.finalText}</p>
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-4 md:col-start-9 md:justify-end">
                <Link href="/status" className="quiet-button quiet-button--dark gap-2">{ui.liveStatus}<Activity size={15} aria-hidden="true" /></Link>
                <Link href="/documentation" className="quiet-button gap-2">{ui.documentation}<ArrowUpRight size={15} aria-hidden="true" /></Link>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>
      <StitchFooter />
    </>
  );
}
