import type { Locale } from "@/lib/i18n";

export interface PublicReleaseNote {
  date: string;
  version: string;
  title: string;
  summary: string;
  changes: string[];
}

const RELEASES: Record<Locale, PublicReleaseNote[]> = {
  ru: [
    {
      date: "06 авг. 2026",
      version: "v0.14.0",
      title: "NVIDIA Tools и безопасные Agent Actions",
      summary: "Erma-модели получили ограниченный read-only tool calling: AI может искать документацию и релизы, проверять статус сервисов, выполнять вычисления, искать в локальном архиве и объяснять возможности моделей.",
      changes: [
        "Добавлена серверная матрица возможностей для каждой Erma-модели; provider ID, ограничения и правила thinking не раскрываются клиенту.",
        "NVIDIA planner использует tools и tool_choice только для подходящих запросов, выполняет не более четырёх вызовов за три раунда и запрещает parallel tool calls.",
        "Tool planning для Nemotron и DeepSeek выполняется с отключённым detailed thinking; финальная генерация сохраняет выбранный пользователем режим reasoning.",
        "Доступны только шесть серверных read-only инструментов: документация, Patch Notes, статус сервисов, вычисления, локальный архив и возможности моделей.",
        "Аргументы каждого инструмента проверяются по закрытой JSON Schema; произвольные URL, shell-команды, filesystem и универсальное выполнение кода отсутствуют.",
        "Каждый инструмент имеет отдельный timeout, а журнал содержит только request ID, имя, статус и длительность без аргументов, результатов и секретов.",
        "Локальный архив передаётся только как временный ограниченный индекс из текущего браузера и не сохраняется на сервере.",
        "Под ответом отображается отдельная карточка «AI использовал инструмент» со статусом, временем и безопасными внутренними ссылками.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.13.1",
      title: "Chat Workspace и полная история обновлений",
      summary: "AI-чат стал удобнее для постоянной работы с локальными диалогами, переключатель RU/EN снова доступен прямо на мобильных экранах, а вкладка «Что нового» теперь отражает каждый релиз.",
      changes: [
        "Диалоги в локальном архиве можно закреплять: закреплённые сессии всегда находятся выше остальных, независимо от времени последнего сообщения.",
        "Добавлено переименование диалогов с сохранением пользовательского названия при последующих сообщениях и повторном открытии сессии.",
        "Удаление всей локальной истории переведено на двухэтапное подтверждение внутри интерфейса, чтобы исключить случайную очистку.",
        "Поиск, счётчик сообщений, активное состояние и действия над сессиями собраны в единый Chat Workspace для desktop и мобильной панели истории.",
        "Переключатель RU/EN снова виден непосредственно в мобильной шапке сайта, без обязательного открытия меню «Ещё».",
        "В мобильном AI-чате добавлен отдельный постоянно доступный переключатель языка интерфейса.",
        "Во вкладку «Что нового» добавлены полноценные записи v0.13.0 и v0.13.1 на русском и английском языках.",
        "Добавлен release-контракт в тестах: новая версия не считается завершённой без публичной записи в Patch Notes и отдельного release-документа.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.13.0",
      title: "True Chat и потоковая генерация",
      summary: "AI-чат перешёл от одиночных запросов к настоящему multi-turn диалогу с потоковой выдачей NVIDIA, управляемым контекстом и реальной остановкой генерации.",
      changes: [
        "AI API принимает полную историю user/assistant сообщений и сохраняет правильный порядок multi-turn диалога.",
        "NVIDIA Chat Completions переведён на SSE streaming с событиями start, delta, meta, error и done.",
        "Ответ появляется по мере генерации, а Stop действительно прерывает upstream-запрос и сохраняет уже полученную часть текста.",
        "Добавлен server-side context manager с консервативным токен-бюджетом, сохранением последних сообщений и сворачиванием старой части в memory summary.",
        "Retry повторяет запрос с корректной предыдущей историей без дублирования текущего сообщения пользователя.",
        "Отдельные сообщения можно исключать из контекста и возвращать обратно; выбор сохраняется в локальном архиве.",
        "Интерфейс показывает стадии подключения, анализа и генерации, а также оценку токенов, число сообщений, файлов и метаданные TTFT.",
        "JSON API сохранён для обратной совместимости, а Clodex использует тот же multi-turn контекст с текущим JSON transport.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.12.0",
      title: "PWA, производительность и язык AI",
      summary: "TK Lab стал устанавливаемым приложением с безопасным offline fallback, локальными визуальными ресурсами и контролем веса сборки. AI отвечает на языке текущего запроса, независимо от языка интерфейса.",
      changes: [
        "Исправлена причина постоянных английских ответов: язык теперь определяется по текущему сообщению пользователя, а locale интерфейса используется только для запросов без распознаваемого естественного языка.",
        "Русский и английский определяются строго, а испанский, казахский, китайский и другие языки получают универсальный контракт ответа на языке текущего запроса; явная просьба сменить язык имеет приоритет.",
        "Код, URL, API-названия, модели и содержимое прикреплённых файлов не перетягивают язык ответа на себя.",
        "NVIDIA и Clodex используют единый языковой контракт, не раскрывая скрытые рассуждения и не ослабляя существующие safety-ограничения.",
        "Добавлен service worker с версионным кэшем статических ресурсов и отдельной offline-страницей; API, auth, admin и HTML-навигация никогда не сохраняются в кэш.",
        "Добавлены install prompt, standalone manifest, maskable SVG-иконка и быстрые действия для AI-чата и Patch Notes.",
        "Главная больше не зависит от внешней доставки изображений: два крупных изображения заменены локальными лёгкими SVG-иллюстрациями с корректной приоритизацией загрузки.",
        "CI проверяет размер JavaScript, gzip, CSS и изображений, а также выполняет Cloudflare Worker dry-run после production build.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.11.1",
      title: "Mobile Profile and Releases",
      summary: "Профиль и история обновлений получили отдельные мобильные сценарии: меньше повторов, безопаснее локальные действия и один выбранный релиз вместо длинной ленты.",
      changes: [
        "Мобильный профиль теперь начинается с компактной карточки аккаунта с аватаром, ролью, уровнем AI-доступа и быстрыми переходами в чат, релизы и локальные данные.",
        "Тяжёлая интерактивная membership-карта и повторяющиеся desktop-блоки скрыты на телефоне, но полностью сохранены на больших экранах.",
        "Параметры аккаунта на телефоне собраны в нативный раскрывающийся блок без дополнительного JavaScript и без блокировки вертикального скролла.",
        "Очистка истории и сброс настроек используют двухэтапное подтверждение внутри страницы вместо системного confirm-диалога.",
        "Экспорт, очистка и сброс сообщают результат через доступный aria-live status; destructive-действия можно отменить до второго нажатия.",
        "Мобильные Patch Notes показывают один выбранный релиз, сохраняют поиск и горизонтальный выбор версии, а также добавляют переходы к предыдущему и следующему релизу.",
        "Для релиза доступно системное Share-меню с безопасным clipboard fallback; прямой hash остаётся стабильным для каждой версии.",
        "История v0.11.0 сохранена отдельной записью при публикации v0.11.1, поэтому переход на новую актуальную версию не удаляет предыдущий релиз.",
      ],
    },
    {
      date: "06 авг. 2026",
      version: "v0.11.0",
      title: "Мобильный интерфейс и данные на устройстве",
      summary: "Телефонная версия получила отдельную навигацию, более компактный AI-чат, улучшенные Patch Notes и понятное управление локальными данными.",
      changes: [
        "Добавлена нижняя мобильная навигация с быстрым доступом к главной, AI-чату, обновлениям и профилю; остальные разделы собраны в доступной панели «Ещё».",
        "Мобильный AI composer стал компактнее: модель и effort объединены в одну панель, а вложение, голос и Send/Stop остаются всегда доступны.",
        "Черновики сохраняются отдельно для каждого локального диалога и восстанавливаются после возврата или перезагрузки страницы.",
        "При отсутствии сети отправка блокируется без потери текста, а интерфейс честно сообщает, что черновик сохранён на устройстве.",
        "Patch Notes получили горизонтальную мобильную навигацию по версиям, прямые ссылки на релизы и копирование ссылки на выбранное обновление.",
        "Профиль стал короче на телефоне и получил экспорт локальной истории, очистку диалогов, сброс черновиков и отображение размера архива.",
        "Главная страница получила более компактные мобильные изображения, отступы и карточку последнего релиза без лишней высоты.",
        "Footer на телефоне разделён на раскрывающиеся группы, а PWA manifest подготавливает сайт к установке на главный экран.",
      ],
    },
  ],
  en: [
    {
      date: "06 Aug 2026",
      version: "v0.14.0",
      title: "NVIDIA Tools and safe Agent Actions",
      summary: "Erma models now support bounded read-only tool calling for documentation and release search, service status, calculations, local archive search, and model capability lookup.",
      changes: [
        "A server-side capability matrix now controls each Erma model; provider IDs, loop limits, and thinking rules remain private.",
        "The NVIDIA planner supplies tools and tool_choice only for relevant prompts, permits at most four calls over three rounds, and disables parallel tool calls.",
        "Tool planning for Nemotron and DeepSeek runs with detailed thinking disabled, while final synthesis preserves the user's selected reasoning mode.",
        "Only six server-allowlisted read-only tools are available: documentation, Patch Notes, service status, calculation, local archive, and model capabilities.",
        "Every tool uses a closed JSON Schema; arbitrary URLs, shell commands, filesystem access, and universal code execution are absent.",
        "Each tool has its own timeout, and logs contain only request ID, tool name, status, and duration—never arguments, results, or secrets.",
        "The local archive is sent only as a temporary bounded index from the current browser and is not stored by the server.",
        "Responses show a separate 'AI used a tool' card with status, duration, and safe internal links.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.13.1",
      title: "Chat Workspace and complete release history",
      summary: "AI chat is easier to use as a persistent local workspace, the RU/EN switch is visible again on mobile screens, and the What's New page now records every release.",
      changes: [
        "Local conversations can be pinned, keeping important sessions above the rest regardless of their last message time.",
        "Conversations can be renamed, and custom titles remain intact after later messages and session restoration.",
        "Clearing the entire local archive now requires a two-step in-page confirmation to prevent accidental data loss.",
        "Search, message counts, active-session state, and session actions are combined into one Chat Workspace for desktop and mobile history panels.",
        "The RU/EN interface switch is visible directly in the mobile site header without requiring the More menu.",
        "Mobile AI chat now has its own always-reachable interface language switch.",
        "The What's New page now includes full bilingual entries for v0.13.0 and v0.13.1.",
        "A release contract was added to tests so a version is not complete without public Patch Notes and a dedicated release document.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.13.0",
      title: "True Chat and streaming generation",
      summary: "AI chat moved from isolated prompts to real multi-turn conversations with NVIDIA streaming, managed context, and genuine cancellation.",
      changes: [
        "The AI API accepts complete user/assistant history and preserves the correct multi-turn message order.",
        "NVIDIA Chat Completions now uses SSE streaming with start, delta, meta, error, and done events.",
        "Responses appear while they are generated, and Stop aborts the upstream request while keeping the partial answer.",
        "Added a server-side context manager with a conservative token budget, recent-message retention, and memory summarization for older context.",
        "Retry rebuilds the request with the correct previous history without duplicating the current user turn.",
        "Individual messages can be excluded from or restored to context, and the preference is persisted in the local archive.",
        "The interface exposes connection, analysis, and generation stages together with token estimates, message/file counts, and TTFT metadata.",
        "The JSON API remains available for compatibility, while Clodex receives the same multi-turn context through its current JSON transport.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.12.0",
      title: "PWA, performance, and AI language",
      summary: "TK Lab is now installable with a privacy-safe offline fallback, local visual assets, and build-size enforcement. AI replies follow the current prompt language instead of the interface locale.",
      changes: [
        "Fixed the cause of English-only replies: response language is inferred from the current user message, with interface locale used only for input without a recognizable natural language.",
        "Russian and English are detected strictly, while Spanish, Kazakh, Chinese, and other languages use a universal same-as-request contract; an explicit request to change language takes priority.",
        "Code, URLs, API names, model names, and attached file bodies cannot take over response-language selection.",
        "NVIDIA and Clodex share one language contract without exposing hidden reasoning or weakening existing safety boundaries.",
        "Added a versioned service worker and dedicated offline page; API, authentication, administration, and HTML navigation responses are never stored in cache.",
        "Added an install prompt, standalone manifest, maskable SVG icon, and shortcuts for AI chat and Patch Notes.",
        "The home page no longer depends on externally hosted images: two large visuals are replaced with lightweight local SVG artwork and explicit loading priority.",
        "CI enforces JavaScript, gzip, CSS, and image budgets and runs a Cloudflare Worker dry-run after the production build.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.11.1",
      title: "Mobile Profile and Releases",
      summary: "Profile and release history now have dedicated mobile flows with less repetition, safer local actions, and one focused release instead of a long feed.",
      changes: [
        "The mobile profile now starts with a compact account card containing the avatar, role, AI access level, and quick links to chat, releases, and local data.",
        "The heavy interactive membership card and repeated desktop sections are hidden on phones while remaining fully available on larger screens.",
        "Mobile account parameters are grouped in a native disclosure without extra JavaScript or interference with vertical scrolling.",
        "History clearing and settings reset now use in-page two-step confirmation instead of a system confirm dialog.",
        "Export, clearing, and reset operations announce results through an accessible aria-live status, and destructive actions can be cancelled before confirmation.",
        "Mobile Patch Notes show one selected release while retaining search and horizontal version selection, with previous and next release navigation.",
        "Each release supports the system share sheet with a safe clipboard fallback, while stable version hashes remain available for direct links.",
        "The v0.11.0 history entry is preserved separately when v0.11.1 becomes current, so publishing the new release does not remove the previous one.",
      ],
    },
    {
      date: "06 Aug 2026",
      version: "v0.11.0",
      title: "Mobile interface and on-device data controls",
      summary: "The phone experience now has dedicated navigation, a more compact AI chat, improved release browsing, and clear local-data controls.",
      changes: [
        "Added bottom mobile navigation for Home, AI chat, Updates, and Profile, with the remaining sections collected in an accessible More sheet.",
        "Made the mobile AI composer more compact by combining model and effort settings while keeping attachment, voice, and Send/Stop controls reachable.",
        "Drafts are stored separately for each local conversation and restored after returning to or reloading the chat.",
        "Offline submission is blocked without losing text, and the interface clearly states that the draft remains on the device.",
        "Patch Notes now use horizontal mobile version navigation, direct release anchors, and one-tap release-link copying.",
        "The mobile profile is shorter and adds conversation export, history clearing, draft/settings reset, and local archive size information.",
        "The home page uses more compact mobile image ratios, spacing, and latest-release presentation.",
        "The mobile footer is organized into expandable groups, while a PWA manifest prepares the site for home-screen installation.",
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
