import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/releases/types";

export type { PublicReleaseNote } from "@/lib/releases/types";

const RELEASES: Record<Locale, PublicReleaseNote[]> = {
  ru: [
    {
      date: "06 авг. 2026",
      version: "v0.15.0",
      title: "Calm Workspace и практичный агент",
      summary: "AI-чат стал спокойнее и понятнее: технические метрики убраны из основного потока, действия собраны в меню, а предсказуемые read-only инструменты запускаются напрямую без лишнего planner-запроса.",
      changes: [
        "Добавлен рекомендуемый режим Erma · Auto и серверные правила выбора глубины ответа.",
        "Постоянная панель режимов, сырые token counts, provider ID, latency, TTFT и Request ID убраны из обычного интерфейса.",
        "Действия над сообщениями и диалогами собраны в компактные меню, а мобильная история доступна через явную кнопку.",
        "Карточки инструментов заменены на раскрываемую Agent Activity без миллисекунд и внутренних статусов.",
        "Вычисления, статус сервисов, сравнение релизов, документация, локальная история и возможности моделей получили прямые recipes.",
        "Неоднозначные tool-запросы используют Lite-planner с лимитом 256 токенов, одним раундом и двумя вызовами по умолчанию.",
        "Страница Access объединена с Models, а desktop-навигация сокращена до AI-чата, моделей, обновлений и статуса.",
        "Persona-промпты переписаны без скрытого reasoning, формулировок «без ограничений» и обязательных catchphrase.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.14.0",
      title: "NVIDIA Tools и безопасные Agent Actions",
      summary: "Erma-модели получили ограниченный read-only tool calling для документации, релизов, статуса, вычислений, локального архива и возможностей моделей.",
      changes: [
        "Добавлена серверная матрица возможностей для каждой Erma-модели.",
        "NVIDIA planner получил tools и tool_choice с серверным allowlist.",
        "Доступны только шесть read-only инструментов.",
        "Аргументы проверяются по закрытым JSON Schema.",
        "Произвольные URL, shell, filesystem и mutating actions отсутствуют.",
        "Вызовы инструментов сохраняются как санитизированные traces.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.13.1",
      title: "Chat Workspace и полная история обновлений",
      summary: "Локальный архив получил проекты, закрепление, переименование и безопасную очистку, а мобильный интерфейс сохранил прямой доступ к RU/EN.",
      changes: [
        "Диалоги можно закреплять и переименовывать.",
        "Добавлены проекты и поиск по локальной истории.",
        "Очистка архива требует двухэтапного подтверждения.",
        "Мобильная история получила отдельную панель.",
        "RU/EN доступен прямо в мобильном интерфейсе.",
        "Каждый релиз сохраняется в общей истории обновлений.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.13.0",
      title: "True Chat и потоковая генерация",
      summary: "AI-чат перешёл к multi-turn диалогам, SSE streaming, управляемому контексту и настоящей остановке генерации.",
      changes: [
        "API принимает историю user/assistant сообщений.",
        "NVIDIA ответы передаются через SSE streaming.",
        "Stop прерывает upstream и сохраняет частичный ответ.",
        "Добавлен server-side context manager.",
        "Сообщения можно исключать из контекста.",
        "Retry использует корректную предыдущую историю.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.12.0",
      title: "PWA, производительность и язык AI",
      summary: "TK Lab стал устанавливаемым приложением с безопасным offline fallback, локальными визуальными ресурсами и контролем веса сборки.",
      changes: [
        "Язык ответа определяется по текущему запросу.",
        "Добавлен service worker и offline-страница.",
        "API и auth-ответы не попадают в offline cache.",
        "Добавлены manifest и maskable icon.",
        "Главные иллюстрации перенесены в локальные SVG.",
        "CI проверяет performance budget и Cloudflare dry-run.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.11.1",
      title: "Mobile Profile and Releases",
      summary: "Профиль и история обновлений получили отдельные мобильные сценарии с безопасными локальными действиями.",
      changes: [
        "Добавлена компактная мобильная карточка аккаунта.",
        "Тяжёлые desktop-блоки скрыты на телефоне.",
        "Настройки профиля собраны в disclosure.",
        "Очистка и сброс используют in-page confirmation.",
        "Локальные действия сообщают результат через aria-live.",
        "Мобильные Patch Notes показывают один выбранный релиз.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.11.0",
      title: "Мобильный интерфейс и данные на устройстве",
      summary: "Телефонная версия получила нижнюю навигацию, компактный composer, офлайн-черновики и управление локальными данными.",
      changes: [
        "Добавлена нижняя мобильная навигация.",
        "Мобильный composer стал компактнее.",
        "Черновики сохраняются отдельно для каждого диалога.",
        "При отсутствии сети текст не теряется.",
        "Patch Notes получили навигацию по версиям.",
        "Профиль получил экспорт и очистку локальной истории.",
      ],
    },
  ],
  en: [
    {
      date: "06 Aug 2026",
      version: "v0.15.0",
      title: "Calm Workspace and practical agent",
      summary: "AI chat is calmer and easier to understand: technical metrics leave the normal flow, actions move into menus, and predictable read-only tools run through direct recipes without an extra planner request.",
      changes: [
        "Added the recommended Erma · Auto route and server-side depth selection helpers.",
        "Removed the permanent mode toolbar, raw token counts, provider IDs, latency, TTFT, and request IDs from normal messages.",
        "Grouped message and conversation actions into compact menus and kept an explicit mobile history button.",
        "Replaced raw tool cards with expandable Agent Activity without milliseconds or internal statuses.",
        "Added direct recipes for calculations, service status, release comparison, documentation, local history, and model capabilities.",
        "Ambiguous tool requests use a Lite planner limited to 256 tokens, one round, and two calls by default.",
        "Merged Access into Models and reduced desktop navigation to AI chat, Models, Updates, and Status.",
        "Rewrote persona prompts without hidden-reasoning requests, no-limits claims, or mandatory catchphrases.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.14.0",
      title: "NVIDIA Tools and safe Agent Actions",
      summary: "Erma models gained bounded read-only tool calling for documentation, releases, status, calculations, local archive search, and model capabilities.",
      changes: [
        "Added a server-side capability matrix for every Erma model.",
        "The NVIDIA planner received tools and tool_choice with a server allowlist.",
        "Only six read-only tools are available.",
        "Arguments are validated against closed JSON Schemas.",
        "Arbitrary URLs, shell, filesystem access, and mutating actions are absent.",
        "Tool calls persist as sanitized traces.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.13.1",
      title: "Chat Workspace and complete release history",
      summary: "The local archive gained projects, pinning, renaming, and safe clearing while mobile kept direct RU/EN access.",
      changes: [
        "Conversations can be pinned and renamed.",
        "Projects and local-history search were added.",
        "Archive clearing uses two-step confirmation.",
        "Mobile history received a dedicated panel.",
        "RU/EN remains directly reachable on mobile.",
        "Every release remains in the shared update history.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.13.0",
      title: "True Chat and streaming generation",
      summary: "AI chat moved to multi-turn conversations, SSE streaming, managed context, and genuine cancellation.",
      changes: [
        "The API accepts user/assistant history.",
        "NVIDIA responses stream through SSE.",
        "Stop aborts upstream and preserves partial output.",
        "A server-side context manager was added.",
        "Messages can be excluded from context.",
        "Retry uses the correct previous history.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.12.0",
      title: "PWA, performance, and AI language",
      summary: "TK Lab became installable with a privacy-safe offline fallback, local visual assets, and build-size enforcement.",
      changes: [
        "Response language follows the current prompt.",
        "A service worker and offline page were added.",
        "API and auth responses stay out of offline cache.",
        "A manifest and maskable icon were added.",
        "Main illustrations moved to local SVG files.",
        "CI enforces performance budgets and Cloudflare dry-run.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.11.1",
      title: "Mobile Profile and Releases",
      summary: "Profile and release history gained dedicated mobile flows with safer local actions.",
      changes: [
        "Added a compact mobile account summary.",
        "Heavy desktop sections are hidden on phones.",
        "Profile settings use a disclosure.",
        "Clearing and reset use in-page confirmation.",
        "Local actions announce results with aria-live.",
        "Mobile Patch Notes focus one selected release.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.11.0",
      title: "Mobile interface and on-device data controls",
      summary: "The phone experience gained bottom navigation, a compact composer, offline drafts, and local-data controls.",
      changes: [
        "Added bottom mobile navigation.",
        "The mobile composer became more compact.",
        "Drafts are stored per conversation.",
        "Offline input is preserved.",
        "Patch Notes gained version navigation.",
        "Profile gained local-history export and clearing.",
      ],
    },
  ],
};

function getRelease(locale: Locale, version: string) {
  const release = RELEASES[locale].find((entry) => entry.version === version);
  if (!release) throw new Error(`Unknown release ${version}`);
  return release;
}

export function getReleaseHistory(locale: Locale): PublicReleaseNote[] {
  return RELEASES[locale].map((release) => ({ ...release, changes: [...release.changes] }));
}

export function getLatestRelease(locale: Locale): PublicReleaseNote {
  return getRelease(locale, "v0.15.0");
}

export function getPreviousReleaseV0140(locale: Locale): PublicReleaseNote {
  return getRelease(locale, "v0.14.0");
}

export function getPreviousReleaseV0131(locale: Locale): PublicReleaseNote {
  return getRelease(locale, "v0.13.1");
}

export function getPreviousReleaseV0130(locale: Locale): PublicReleaseNote {
  return getRelease(locale, "v0.13.0");
}

export function getPreviousReleaseV0120(locale: Locale): PublicReleaseNote {
  return getRelease(locale, "v0.12.0");
}

export function getPreviousReleaseV0111(locale: Locale): PublicReleaseNote {
  return getRelease(locale, "v0.11.1");
}

export function getPreviousReleaseV0110(locale: Locale): PublicReleaseNote {
  return getRelease(locale, "v0.11.0");
}
