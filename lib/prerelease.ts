import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_CHANNEL, CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

export interface PreviewReleaseNote extends PublicReleaseNote { channel: "preview"; majorUpdate: true; codename: typeof CURRENT_RELEASE_CODENAME; stability: "beta"; knownIssues: string[]; migrationNotes: string[]; }

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "13 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA EVIGILATA — мобильная и десктопная доводка",
    summary: "Сквозной проход по мобильному и десктопному интерфейсу: почищены реальные баги вёрстки, навигации и доступности, без изменений в провайдерах моделей или тарифах.",
    changes: [
      "Мобильное окно согласия (TermsGate) больше не даёт кнопке «Принять» уезжать за пределы экрана на длинном тексте — текст соглашения теперь скроллится отдельно, кнопка всегда видна.",
      "Тап-таргеты нижнего переключателя Чат/Задачи/Файлы увеличены до 44px (были 38.4px в портретной и 33.6px в альбомной ориентации).",
      "Уведомление о передаче данных внешнему AI-провайдеру больше не перекрывает поле ввода при первом визите на маленьких экранах — перенесено под шапку.",
      "Переключение диалогов в истории на десктопе теперь происходит клиентски, без перезагрузки страницы; поздний ответ от прошлого диалога больше не может попасть в новый выбранный чат.",
      "Всплывающие меню (вложения, выбор модели) на десктопе считают реальные границы видимой области и разворачиваются в другую сторону, если не помещаются.",
      "Вкладка Runs в рабочей области стала настоящей отдельной вкладкой — раньше при открытии Runs визуально оставалась выделена вкладка Flow.",
      "Клавиатурная навигация в выборе модели ограничена самим контролом и не перехватывает клавиши у текстового поля ввода.",
      "Playwright закреплён как реальная зависимость проекта и добавлено заметно больше сквозных проверок для мобильных и десктопных сценариев.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Реальные полевые замеры LCP/CLS/TBT/INP на эмулированном мобильном профиле начаты, но не завершены в рамках этого релиза.",
      "Две крупные страницы (главная и Patch Notes) всё ещё рендерят отдельные mobile- и desktop-ветки разметки одновременно; консолидация запланирована отдельно.",
    ],
    migrationNotes: [
      "Новых D1 migrations в v0.25.0 нет.",
      "Новых переменных окружения или Cloudflare secrets релиз не требует.",
      "Изменения затрагивают только клиентский UI и локальные e2e-тесты; серверные контракты API не менялись.",
    ],
  },
  en: {
    date: "13 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA EVIGILATA — mobile and desktop hardening",
    summary: "An end-to-end pass over the mobile and desktop interface: real layout, navigation, and accessibility bugs fixed, with no changes to model providers or pricing.",
    changes: [
      "The mobile consent screen (TermsGate) no longer lets the Accept button drift off-screen on a long document — the terms text now scrolls in its own region and the button stays visible.",
      "Tap targets on the bottom Chat/Tasks/Files switcher were raised to 44px (previously 38.4px in portrait and 33.6px in landscape).",
      "The external-AI-provider disclosure banner no longer covers the composer on a first visit at shorter screen heights — moved below the header.",
      "Desktop history navigation now switches the active chat client-side without a page reload; a late response from a previous chat can no longer write into the newly selected one.",
      "Desktop popovers (attachments, model picker) now measure real viewport bounds and flip placement when they would otherwise overflow.",
      "The Runs tab is now a genuine, independently selected tab — previously opening Runs left the Flow tab visually marked as selected.",
      "Model-picker keyboard handling is scoped to its own control and no longer captures keys away from the prompt textarea.",
      "@playwright/test is now a real project dependency, and end-to-end coverage was significantly expanded for both mobile and desktop scenarios.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Real field measurements for LCP/CLS/TBT/INP on an emulated mobile profile were started but not completed for this release.",
      "Two major pages (home and Patch Notes) still render separate mobile and desktop markup branches at once; consolidation is planned separately.",
    ],
    migrationNotes: [
      "v0.25.0 adds no D1 migrations.",
      "No new environment variables or Cloudflare secrets are required.",
      "Changes are limited to client UI and local e2e tests; server API contracts are unchanged.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote {
  const release = PREVIEW_RELEASE[locale];
  return { ...release, changes: [...release.changes], knownIssues: [...release.knownIssues], migrationNotes: [...release.migrationNotes] };
}
