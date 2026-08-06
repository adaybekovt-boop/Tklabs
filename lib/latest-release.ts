import type { Locale } from "@/lib/i18n";

export interface PublicReleaseNote {
  date: string;
  version: string;
  title: string;
  summary: string;
  changes: string[];
}

function release(locale: Locale, ru: Omit<PublicReleaseNote, "date">, en: Omit<PublicReleaseNote, "date">): PublicReleaseNote {
  return locale === "ru"
    ? { date: "06 авг. 2026", ...ru }
    : { date: "06 Aug 2026", ...en };
}

export function getPreviousReleaseV0110(locale: Locale): PublicReleaseNote {
  return release(locale, {
    version: "v0.11.0",
    title: "Мобильный интерфейс и данные на устройстве",
    summary: "Телефонная версия получила отдельную навигацию, компактный AI-чат и понятное управление локальными данными.",
    changes: [
      "Добавлена нижняя мобильная навигация и доступная панель «Ещё».",
      "Мобильный composer стал компактнее, а черновики сохраняются отдельно для каждого диалога.",
      "Offline-режим не теряет текст, профиль поддерживает экспорт и очистку локальной истории.",
      "Patch Notes получили прямые ссылки на версии, а PWA manifest подготовил установку приложения.",
    ],
  }, {
    version: "v0.11.0",
    title: "Mobile interface and on-device data controls",
    summary: "The phone experience gained dedicated navigation, a compact AI chat, and clear local-data controls.",
    changes: [
      "Added bottom mobile navigation and an accessible More sheet.",
      "Made the mobile composer compact and stored drafts separately per conversation.",
      "Offline mode preserves text, while Profile supports local history export and clearing.",
      "Patch Notes gained direct version links and the PWA manifest prepared installation.",
    ],
  });
}

export function getPreviousReleaseV0111(locale: Locale): PublicReleaseNote {
  return release(locale, {
    version: "v0.11.1",
    title: "Mobile Profile and Releases",
    summary: "Профиль и история обновлений получили отдельные мобильные сценарии с меньшим количеством повторов.",
    changes: [
      "Добавлена компактная мобильная карточка аккаунта и быстрые переходы.",
      "Локальные destructive-действия получили двухэтапное подтверждение и aria-live статусы.",
      "Мобильные Patch Notes показывают один выбранный релиз, поиск и переходы между версиями.",
      "Стабильные hash-ссылки и системный Share сохраняют историю релизов доступной.",
    ],
  }, {
    version: "v0.11.1",
    title: "Mobile Profile and Releases",
    summary: "Profile and release history gained focused mobile flows with less repetition.",
    changes: [
      "Added a compact mobile account card and quick navigation.",
      "Local destructive actions now use two-step confirmation and aria-live status updates.",
      "Mobile Patch Notes show one selected release with search and version navigation.",
      "Stable hashes and the system Share flow keep release history accessible.",
    ],
  });
}

export function getPreviousReleaseV0120(locale: Locale): PublicReleaseNote {
  return release(locale, {
    version: "v0.12.0",
    title: "PWA, производительность и язык AI",
    summary: "TK Lab стал устанавливаемым приложением, а AI начал отвечать на языке текущего запроса.",
    changes: [
      "Язык ответа определяется по текущему сообщению, а не по locale интерфейса.",
      "Добавлены service worker, privacy-safe offline fallback, install prompt и maskable-иконка.",
      "Внешние изображения главной заменены локальными лёгкими ресурсами.",
      "CI контролирует размер клиентских ресурсов и выполняет Cloudflare Worker dry-run.",
    ],
  }, {
    version: "v0.12.0",
    title: "PWA, performance, and AI language",
    summary: "TK Lab became installable and AI replies began following the current prompt language.",
    changes: [
      "Response language now follows the current message instead of interface locale.",
      "Added a service worker, privacy-safe offline fallback, install prompt, and maskable icon.",
      "External home imagery was replaced by lightweight local assets.",
      "CI enforces client asset budgets and runs a Cloudflare Worker dry-run.",
    ],
  });
}

export function getLatestRelease(locale: Locale): PublicReleaseNote {
  return release(locale, {
    version: "v0.13.0",
    title: "True Chat and Streaming",
    summary: "AI-чат получил реальный контекст текущего диалога и потоковую доставку проверенного ответа через SSE.",
    changes: [
      "Каждый новый запрос получает ограниченную и очищенную историю предыдущих user/assistant сообщений вместо одного изолированного prompt.",
      "Добавлен context manager с отдельными публичными и privileged-лимитами, защитой от ошибочных сообщений и отсечением старых ходов.",
      "NVIDIA использует upstream streaming, а браузер получает типизированные start, delta, meta, done и error события через SSE.",
      "Полный ответ и скрытое reasoning проверяются сервером до публичной передачи; raw reasoning не попадает в браузер или локальный архив.",
      "Stop прерывает принадлежащий запрос и сохраняет уже полученную часть ответа в текущем диалоге.",
      "Старый JSON-маршрут сохранён для совместимости, а Clodex fallback получает тот же ограниченный контекст.",
      "Добавлены unit-тесты context manager, Unicode chunking, SSE parser и порядка multi-turn сообщений.",
    ],
  }, {
    version: "v0.13.0",
    title: "True Chat and Streaming",
    summary: "AI chat now has real conversation context and validated SSE response delivery.",
    changes: [
      "Each request receives bounded, sanitized user/assistant history instead of one isolated prompt.",
      "Added a context manager with separate public and privileged limits, error filtering, and oldest-turn removal.",
      "NVIDIA uses upstream streaming while the browser receives typed start, delta, meta, done, and error SSE events.",
      "The full answer and hidden reasoning are checked server-side before public delivery; raw reasoning never reaches the browser or archive.",
      "Stop aborts the owned request and preserves the answer portion already received by the current conversation.",
      "The legacy JSON route remains compatible, while Clodex fallback receives the same bounded context.",
      "Added unit coverage for context selection, Unicode chunking, SSE parsing, and multi-turn ordering.",
    ],
  });
}
