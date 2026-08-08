import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_CHANNEL, CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

export interface PreviewReleaseNote extends PublicReleaseNote { channel: "preview"; majorUpdate: true; codename: typeof CURRENT_RELEASE_CODENAME; stability: "beta"; knownIssues: string[]; migrationNotes: string[]; }

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "08 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "MOBILE FIXED LAYERS — Legal, Navigation & Viewport Reliability",
    summary: "ПАТЧ TRUST ARCHITECTURE · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. v0.20.10 исправляет класс мобильных ошибок, при которых соглашение, навигация или drawers зависели от длины документа: критичные панели теперь живут как независимые viewport layers.",
    changes: [
      "Пользовательское соглашение рендерится через document.body portal и сразу занимает текущий mobile viewport, независимо от позиции страницы.",
      "В TermsGate прокручивается только текст договора; header и accept/decline actions остаются внутри видимого экрана и учитывают safe-area.",
      "Public AppDock закреплён как body-level fixed layer и остаётся видимым при прокрутке длинных страниц.",
      "Mobile Workspace Switcher закреплён над visual viewport и резервирует место в chat workspace, поэтому больше не появляется только в конце чата.",
      "Chat/Trust sheets и mobile drawer используют единый reference-counted scroll lock, чтобы фон не прокручивался и не сдвигал fixed UI.",
      "Добавлены Browser Assurance сценарии для tall-page TermsGate, persistent AppDock и workspace dock на mobile Chromium/WebKit.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Текст соглашения остаётся прокручиваемым внутри legal panel — это намеренно, но действия принятия и отказа всегда остаются в viewport.",
      "При открытой экранной клавиатуре Trust disclosure скрывается, а workspace dock следует visual viewport; composer остаётся приоритетным интерактивным слоем.",
      "Workspace Sync по-прежнему является server-side encryption at rest, не end-to-end encryption.",
      "Nonce-only CSP остаётся report-only для текущего Next/Vinext hydration path.",
    ],
    migrationNotes: [
      "Новых D1 migration для v0.20.10 нет.",
      "После деплоя браузер обновит Service Worker cache namespace до v0.20.10-mobile-fixed-layers-r1.",
      "Проверки mobile viewport выполняются в Browser Assurance на Chromium и WebKit.",
    ],
  },
  en: {
    date: "08 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "MOBILE FIXED LAYERS — Legal, Navigation & Viewport Reliability",
    summary: "TRUST ARCHITECTURE PATCH · PRE-RELEASE. v0.20.10 fixes the mobile failure class where consent, navigation, or drawers depended on document length: critical controls now live as independent viewport layers.",
    changes: [
      "The user agreement renders through a document.body portal and immediately occupies the current mobile viewport regardless of page scroll position.",
      "Only legal document content scrolls inside TermsGate; the header and accept/decline actions stay visible and respect safe-area insets.",
      "Public AppDock is a body-level fixed layer that remains visible across long-page scrolling.",
      "Mobile Workspace Switcher is pinned to the visual viewport and reserves chat workspace space instead of appearing only at the end of a conversation.",
      "Chat/Trust sheets and the mobile drawer share a reference-counted scroll lock so background scrolling cannot move fixed UI.",
      "Browser Assurance now covers tall-page TermsGate, persistent AppDock, and the workspace dock on mobile Chromium/WebKit.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Agreement text still scrolls inside the legal panel by design, while accept and decline actions remain in the viewport.",
      "When the software keyboard is open, Trust disclosure is hidden and the workspace dock follows the visual viewport so the composer remains the primary interaction layer.",
      "Workspace Sync remains server-side encryption at rest, not end-to-end encryption.",
      "Nonce-only CSP remains report-only for the current Next/Vinext hydration path.",
    ],
    migrationNotes: [
      "v0.20.10 introduces no new D1 migrations.",
      "After deployment the browser refreshes the Service Worker cache namespace to v0.20.10-mobile-fixed-layers-r1.",
      "Mobile viewport contracts run in Browser Assurance on Chromium and WebKit.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote { const release = PREVIEW_RELEASE[locale]; return { ...release, changes: [...release.changes], knownIssues: [...release.knownIssues], migrationNotes: [...release.migrationNotes] }; }
