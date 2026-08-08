import type { Locale } from "@/lib/i18n";

export type ModelCard = { id: "lite" | "core" | "pro"; name: string; purpose: string; limitations: string; tools: string; providerClass: string; dataHandling: string };
export function getModelCards(locale: Locale): ModelCard[] {
  const ru = locale === "ru";
  return [
    { id: "lite", name: "Erma Lite", purpose: ru ? "Быстрый диалог и короткие рабочие задачи." : "Fast dialogue and short working tasks.", limitations: ru ? "Меньший контекст и глубина; результат требует проверки." : "Smaller context/depth; outputs require verification.", tools: ru ? "Read-only tools по capability route." : "Read-only tools through the capability route.", providerClass: "External model provider", dataHandling: ru ? "Prompt и выбранный контекст покидают устройство для inference." : "Prompt and selected context leave the device for inference." },
    { id: "core", name: "Erma Core", purpose: ru ? "Анализ, письмо и структурированные решения." : "Analysis, writing, and structured solutions.", limitations: ru ? "Может ошибаться и не является профессиональным заключением." : "Can be wrong and is not a professional determination.", tools: ru ? "Read-only tools, bounded rounds/calls." : "Read-only tools with bounded rounds/calls.", providerClass: "External model provider", dataHandling: ru ? "Provider route раскрывается через безопасные response metadata." : "Provider route is disclosed through safe response metadata." },
    { id: "pro", name: "Erma Pro", purpose: ru ? "Глубокий разбор и многошаговое проектирование." : "Deep analysis and multi-step design.", limitations: ru ? "Больший reasoning budget не гарантирует фактическую точность." : "A larger reasoning budget does not guarantee factual correctness.", tools: ru ? "Bounded read-only agent tools; без shell/write capabilities." : "Bounded read-only agent tools; no shell/write capabilities.", providerClass: "External model provider", dataHandling: ru ? "Hidden reasoning не возвращается и не архивируется." : "Hidden reasoning is neither returned nor archived." },
  ];
}
