import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_CHANNEL, CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

export interface PreviewReleaseNote extends PublicReleaseNote { channel: "preview"; majorUpdate: true; codename: typeof CURRENT_RELEASE_CODENAME; stability: "beta"; knownIssues: string[]; migrationNotes: string[]; }

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "08 авг. 2026", version: CURRENT_RELEASE_VERSION, title: "ERMA INTELLIGENCE ENGINE — Web, Knowledge, Math & Verification",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ ERMA · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. v0.21.15 превращает Erma из обычного model chat в route-aware систему с контролируемым web research, каноническими знаниями TK LAB, deterministic math, document retrieval, verification и smart Auto routing.",
    changes: [
      "Cognitive Router определяет intent, freshness, tool class, verification и bounded budget до генерации ответа.",
      "Web Intelligence использует server-side Brave Search и открывает только same-request search result IDs; внешний контент всегда untrusted.",
      "TK LAB Knowledge Brain отвечает по Terms, Privacy, AUP, AI Transparency, Security, Product Facts и Patch Notes из канонических источников.",
      "Math Engine проверяет arithmetic/quadratic/statistics/determinant/polynomial calculus и выводит LaTeX, который рендерится через KaTeX.",
      "Evidence + Verifier различают найденный источник, реально открытый web source, документный chunk, deterministic math и sandbox execution.",
      "Document Intelligence извлекает релевантные request-scoped chunks из прикреплённых файлов вместо бесконтрольной отправки всего документа в reasoning.",
      "Erma · Auto теперь реально выбирает Lite/Core/Pro по route/complexity; explicit model selection сохраняется.",
      "Code Lab допускает execution только через optional isolated external sandbox с network=off и temporary filesystem; application Worker никогда не исполняет пользовательский код.",
    ],
    channel: CURRENT_RELEASE_CHANNEL, majorUpdate: true, codename: CURRENT_RELEASE_CODENAME, stability: "beta",
    knownIssues: [
      "Live web search требует server-only BRAVE_SEARCH_API_KEY; без него web tools fail-closed, а обычный model response остаётся доступен.",
      "Code Lab execution требует отдельно развёрнутый CODE_SANDBOX_URL/TOKEN. В репозитории и Worker нет встроенного host code executor.",
      "Web gateway блокирует literal private/local targets и scoped URL opening, но не заявляется как универсальный browser/JS runtime; страницы с обязательным client-side JS могут дать неполный text extract.",
      "Новая layered memory на server side имеет persistence=request-context-only; долговременное хранение по-прежнему регулируется существующими Local/Synced/Ephemeral режимами.",
      "Deterministic Math Engine покрывает заявленный ограниченный набор операций и не является универсальным CAS.",
    ],
    migrationNotes: [
      "Новых D1 migrations в v0.21.15 нет.",
      "Для Web Intelligence опционально добавить BRAVE_SEARCH_API_KEY как server-only secret.",
      "Для Code Lab опционально настроить отдельный изолированный sandbox через CODE_SANDBOX_URL и CODE_SANDBOX_TOKEN.",
      "Добавлены KaTeX/remark-math/rehype-katex зависимости; package lock и Service Worker cache namespace синхронизируются с v0.21.15.",
    ],
  },
  en: {
    date: "08 Aug 2026", version: CURRENT_RELEASE_VERSION, title: "ERMA INTELLIGENCE ENGINE — Web, Knowledge, Math & Verification",
    summary: "MAJOR ERMA UPDATE · PRE-RELEASE. v0.21.15 turns Erma from a model chat into a route-aware system with controlled web research, canonical TK LAB knowledge, deterministic math, document retrieval, verification, and smart Auto routing.",
    changes: [
      "Cognitive Router classifies intent, freshness, tool class, verification, and bounded budget before answer generation.",
      "Web Intelligence uses server-side Brave Search and opens only same-request search-result IDs; external content is always untrusted.",
      "TK LAB Knowledge Brain answers from canonical Terms, Privacy, AUP, AI Transparency, Security, Product Facts, and Patch Notes sources.",
      "Math Engine verifies arithmetic/quadratic/statistics/determinant/polynomial calculus and returns LaTeX rendered through KaTeX.",
      "Evidence + Verifier distinguish search discovery, actually opened web sources, document chunks, deterministic math, and sandbox execution.",
      "Document Intelligence retrieves relevant request-scoped chunks from attachments instead of treating the entire file as undifferentiated reasoning input.",
      "Erma · Auto now genuinely chooses Lite/Core/Pro using route/complexity while explicit model selection remains respected.",
      "Code Lab execution is allowed only through an optional isolated external sandbox with network=off and a temporary filesystem; the application Worker never executes user code.",
    ],
    channel: CURRENT_RELEASE_CHANNEL, majorUpdate: true, codename: CURRENT_RELEASE_CODENAME, stability: "beta",
    knownIssues: [
      "Live web search requires the server-only BRAVE_SEARCH_API_KEY; without it web tools fail closed while normal model responses remain available.",
      "Code Lab execution requires a separately deployed CODE_SANDBOX_URL/TOKEN. The repository and Worker contain no built-in host code executor.",
      "The web gateway blocks literal private/local targets and scopes page opening to search results, but it is not a universal browser/JS runtime; client-JS-only pages may yield incomplete text.",
      "The new server-side layered memory reports persistence=request-context-only; durable storage remains governed by existing Local/Synced/Ephemeral modes.",
      "The deterministic Math Engine covers the documented bounded operation set and is not a universal CAS.",
    ],
    migrationNotes: [
      "v0.21.15 adds no D1 migrations.",
      "Optionally add BRAVE_SEARCH_API_KEY as a server-only secret for Web Intelligence.",
      "Optionally configure a separate isolated runner through CODE_SANDBOX_URL and CODE_SANDBOX_TOKEN for Code Lab.",
      "KaTeX/remark-math/rehype-katex dependencies are added; the package lock and Service Worker cache namespace are synchronized with v0.21.15.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote { const release = PREVIEW_RELEASE[locale]; return { ...release, changes: [...release.changes], knownIssues: [...release.knownIssues], migrationNotes: [...release.migrationNotes] }; }
