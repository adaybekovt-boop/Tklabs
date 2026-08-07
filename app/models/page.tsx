import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Check, Wrench } from "lucide-react";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { MAX_TOKENS_BY_TIER, PUBLIC_ERMA_AUTO_MODEL, PUBLIC_ERMA_MODELS, type PublicErmaModel } from "@/lib/models/public";

export const metadata: Metadata = {
  title: "TK LAB — Erma Models",
  description: "Erma Auto, model levels, capabilities, and access limits.",
};

function modelDescription(model: PublicErmaModel, locale: "ru" | "en") {
  if (locale === "ru") {
    if (model.tier === "light") return "Быстрые ответы, классификация, короткие тексты и простые инструментальные действия.";
    if (model.tier === "medium") return "Основной рабочий уровень для анализа, письма, документации и повседневных технических задач.";
    return "Сложная архитектура, длинные технические задачи, сравнения и глубокий анализ с явными ограничениями.";
  }
  if (model.tier === "light") return "Fast answers, classification, short writing, and simple tool-assisted tasks.";
  if (model.tier === "medium") return "The primary work tier for analysis, writing, documentation, and everyday technical tasks.";
  return "Complex architecture, long technical tasks, comparisons, and deep analysis with explicit limitations.";
}

export default async function ModelsPage() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const ru = locale === "ru";

  return (
    <>
      <StitchHeader active="models" />
      <main className="stitch-container py-section-gap">
        <section className="mb-section-gap grid gap-10 border-b border-outline-variant/30 pb-14 md:grid-cols-12 md:items-end">
          <ScrollReveal className="md:col-span-8">
            <p className="label-caps mb-6 text-secondary">ERMA MODELS</p>
            <h1 className="display-title">{ru ? "Один ассистент, подходящая глубина" : "One assistant, the right depth"}</h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="border-l border-primary pl-7 text-[18px] leading-[1.7] text-on-surface-variant md:col-span-4 md:col-start-9">
            {ru ? "По умолчанию Erma Auto выбирает уровень под задачу. Ручной выбор остаётся доступен в расширенных настройках чата." : "Erma Auto selects a tier for each task by default. Manual selection remains available in advanced chat settings."}
          </ScrollReveal>
        </section>

        <ScrollReveal>
          <section className="mb-8 overflow-hidden rounded-3xl border border-primary bg-primary p-7 text-on-primary md:p-10">
            <div className="grid gap-8 md:grid-cols-12 md:items-center">
              <div className="md:col-span-7">
                <p className="label-caps opacity-75">{ru ? "Рекомендуется" : "Recommended"}</p>
                <h2 className="mt-4 font-serif text-[36px] md:text-[44px]">{PUBLIC_ERMA_AUTO_MODEL.name}</h2>
                <p className="mt-4 max-w-2xl leading-[1.7] opacity-85">{ru ? "Короткие запросы направляются в быстрый уровень, обычная работа — в Core, а сложная архитектура и глубокий анализ — в Pro. Provider-маршруты остаются серверными." : "Short requests use the fast tier, everyday work uses Core, and complex architecture or deep analysis uses Pro. Provider routing stays server-side."}</p>
              </div>
              <div className="md:col-span-4 md:col-start-9">
                <Link href="/playground?model=erma-auto" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-on-primary px-5 text-sm font-medium text-primary">{ru ? "Открыть Erma Auto" : "Open Erma Auto"}<ArrowUpRight size={16} /></Link>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <StaggerContainer className="grid gap-4 md:grid-cols-3" staggerDelay={0.08}>
          {PUBLIC_ERMA_MODELS.map((model) => (
            <StaggerItem key={model.key}>
              <article className="flex h-full flex-col rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 md:p-7">
                <div className="flex items-start justify-between gap-4"><span className="label-caps text-secondary">{model.tier}</span><span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] text-on-secondary-container">{MAX_TOKENS_BY_TIER[model.tier].toLocaleString(ru ? "ru-RU" : "en-US")} max tokens</span></div>
                <h2 className="mt-8 font-serif text-[30px] text-primary">{model.name}</h2>
                <p className="mt-4 flex-1 leading-[1.7] text-on-surface-variant">{modelDescription(model, locale)}</p>
                <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-on-secondary-container">
                  <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1.5"><Check size={12} />Text files</span>
                  {model.reasoning && <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1.5"><Check size={12} />Reasoning</span>}
                  <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1.5"><Wrench size={12} />Read-only tools</span>
                </div>
                <Link href={`/playground?model=${model.key}`} className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary hover:text-on-primary">{text.models.openInLab}<ArrowUpRight size={15} /></Link>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <section id="access" className="mt-section-gap scroll-mt-28 border-t border-outline-variant/30 pt-12">
          <ScrollReveal className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-4"><p className="label-caps mb-4 text-secondary">ACCESS</p><h2 className="headline-title">{ru ? "Доступ без отдельной сложной страницы" : "Access without a separate maze"}</h2></div>
            <div className="space-y-5 leading-[1.8] text-on-surface-variant md:col-span-7 md:col-start-6">
              <p>{ru ? "Гостевой режим сохраняет дневной лимит демо. Авторизованный профиль показывает доступные уровни и расширенные лимиты прямо в чате и профиле." : "Guest mode keeps the daily demo limit. Signed-in profiles show available tiers and expanded limits directly in chat and profile."}</p>
              <p>{ru ? "Все Erma-модели работают только с серверным allowlist read-only инструментов. Изменяющие действия, shell, произвольные URL и автономные фоновые агенты не включены." : "All Erma models use a server allowlist of read-only tools. Mutating actions, shell access, arbitrary URLs, and autonomous background agents are not enabled."}</p>
              <div className="flex flex-wrap gap-3"><Link href="/playground" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary">{ru ? "Открыть AI-чат" : "Open AI chat"}</Link><Link href="/profile" className="inline-flex min-h-11 items-center rounded-full border border-primary px-5 text-sm font-medium text-primary">{ru ? "Проверить профиль" : "Check profile"}</Link></div>
            </div>
          </ScrollReveal>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
