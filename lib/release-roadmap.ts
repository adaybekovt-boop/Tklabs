import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/releases/types";

export type WorkspaceEvolutionRelease = PublicReleaseNote & {
  phase: "foundation" | "mobile-shell" | "mobile-chat" | "chat-runtime" | "flow" | "artifacts" | "sync" | "pwa";
};

const RELEASES: Record<Locale, WorkspaceEvolutionRelease[]> = {
  ru: [
    {
      date: "08 авг. 2026",
      version: "v0.19.7",
      phase: "pwa",
      title: "PWA & Reliability",
      summary: "Финальный этап Workspace Evolution: обновляемое PWA, восстановление интерфейса после background/suspend и усиленные mobile/browser reliability-контракты.",
      changes: [
        "Service Worker получил отдельный cache revision для Workspace Evolution и безопасный канал обновления приложения.",
        "PWA runtime показывает доступное обновление и позволяет применить его без ручной очистки кэша.",
        "Offline-режим сохраняет локальные данные и черновики, не пытаясь кэшировать приватные API/auth ответы.",
        "Добавлены regression-контракты на mobile shell, structured memory, multi-round tools, artifacts, sync и release identity.",
      ],
    },
    {
      date: "08 авг. 2026",
      version: "v0.19.6",
      phase: "sync",
      title: "Optional Workspace Sync",
      summary: "Добавлена опциональная синхронизация рабочего пространства: сервер хранит только зашифрованный snapshot, а local-first режим остаётся стандартным.",
      changes: [
        "Добавлен D1 snapshot-контракт с revision, checksum и optimistic concurrency.",
        "Payload шифруется AES-GCM перед записью; без server secret sync fail-closed и не меняет локальные данные.",
        "Добавлены GET/PUT API для чтения и обновления snapshot с origin/auth проверками.",
        "Vault остаётся независимым ручным экспортом и способом восстановления.",
      ],
    },
    {
      date: "08 авг. 2026",
      version: "v0.19.5",
      phase: "artifacts",
      title: "Files & Artifact Workspace",
      summary: "Файлы и артефакты становятся частью рабочего процесса: безопасное извлечение текстового контента, расширенная версия artifact schema и связи с диалогами/runs.",
      changes: [
        "Composer принимает TXT, Markdown, CSV, JSON и bounded PDF с локальным best-effort text extraction без стороннего parser runtime.",
        "Artifact schema v2 добавляет favorite и связи source session/run/document при сохранении обратной совместимости v1.",
        "Версии артефактов продолжают храниться локально и ограничены по размеру/количеству.",
        "Document ingestion проверяет MIME/расширение, byte budget, character budget и очищает управляющие символы.",
      ],
    },
    {
      date: "08 авг. 2026",
      version: "v0.19.4",
      phase: "flow",
      title: "Erma Flow 2.0",
      summary: "Read-only агентный runtime получает настоящий bounded multi-round цикл Inspect → Execute → Verify без shell и произвольных URL.",
      changes: [
        "Planner может выполнить до трёх последовательных tool rounds вместо одного.",
        "Общий лимит tool calls поднят до шести и остаётся ограничен capability matrix выбранной модели.",
        "Agent Run Protocol получил step.failed, чтобы частичное падение не теряло состояние всего run.",
        "Planner явно обязан завершаться сразу после получения достаточных данных и воспринимать tool output только как недоверенные данные.",
      ],
    },
    {
      date: "08 авг. 2026",
      version: "v0.19.3",
      phase: "chat-runtime",
      title: "Chat Runtime 3.0",
      summary: "Контекст длинных диалогов переводится с простого excerpt-summary на структурированную project memory: цели, решения, ограничения, факты и открытые задачи.",
      changes: [
        "Добавлен deterministic structured-memory builder без дополнительного provider вызова.",
        "Compaction сохраняет последние сообщения verbatim, а старые превращает в bounded memory sections.",
        "Token budget по-прежнему резервирует место под ответ и отбрасывает memory секции только при необходимости.",
        "Memory не сохраняет hidden reasoning и строится только из явного user/assistant контента.",
      ],
    },
    {
      date: "08 авг. 2026",
      version: "v0.19.2",
      phase: "mobile-chat",
      title: "Mobile Chat Pro",
      summary: "Мобильный чат стабилизирован вокруг клавиатуры, safe-area и touch navigation: меньше прыжков layout, удобнее drawers и landscape.",
      changes: [
        "VisualViewport теперь публикует высоту, ширину, offset и keyboard inset в CSS variables.",
        "Composer и transcript используют стабильную visual-height геометрию при открытии экранной клавиатуры.",
        "Mobile history drawer закрывается горизонтальным swipe и сохраняет focus/scroll-lock контракты.",
        "Landscape и small-height режимы уменьшают декоративные отступы, сохраняя 44px touch targets.",
      ],
    },
    {
      date: "08 авг. 2026",
      version: "v0.19.1",
      phase: "mobile-shell",
      title: "Mobile Shell 2.0",
      summary: "Публичный mobile shell и AI workspace получают единую навигационную модель вместо дублирующихся верхних/нижних контролов.",
      changes: [
        "Глобальный public header становится desktop-only; на телефоне AppDock остаётся единственной глобальной навигацией.",
        "В workspace добавлен компактный mobile switcher Chat / Flow / Artifacts / Runs.",
        "Внутренние workspace-разделы переключаются одним нажатием без обязательного возврата сначала в чат.",
        "Добавлены CSS-контракты для safe-area, visual viewport и компактного landscape режима.",
      ],
    },
    {
      date: "08 авг. 2026",
      version: "v0.19.0",
      phase: "foundation",
      title: "Workspace Evolution Foundation",
      summary: "Начало новой major-серии: единая release-карта v0.19, документация инвариантов и подготовка архитектуры к mobile/runtime/sync изменениям.",
      changes: [
        "Определена последовательность v0.19.0–v0.19.7 и единый набор release notes для вкладки Updates.",
        "Release identity будет повышен только после завершения всей серии, чтобы промежуточные этапы не выдавались за финальный релиз.",
        "Сохранены текущие security boundaries: auth, origin checks, read-only tools, bounded request bodies и release safety gates.",
        "Каждый этап получает отдельный commit и regression contract перед переходом к следующему.",
      ],
    },
  ],
  en: [
    {
      date: "08 Aug 2026",
      version: "v0.19.7",
      phase: "pwa",
      title: "PWA & Reliability",
      summary: "The final Workspace Evolution stage adds an update-aware PWA, background/suspend recovery, and stronger mobile/browser reliability contracts.",
      changes: [
        "The Service Worker gets a dedicated Workspace Evolution cache revision and safe app-update channel.",
        "PWA runtime surfaces an available update and can apply it without manual cache clearing.",
        "Offline mode preserves local data and drafts without caching private API/auth responses.",
        "Regression contracts cover the mobile shell, structured memory, multi-round tools, artifacts, sync, and release identity.",
      ],
    },
    {
      date: "08 Aug 2026",
      version: "v0.19.6",
      phase: "sync",
      title: "Optional Workspace Sync",
      summary: "Optional workspace synchronization is added: the server stores an encrypted snapshot while local-first remains the default mode.",
      changes: [
        "A D1 snapshot contract adds revision, checksum, and optimistic concurrency.",
        "Payloads are encrypted with AES-GCM before storage; sync fails closed when the server secret is unavailable.",
        "Authenticated GET/PUT APIs read and update snapshots with origin and body-size checks.",
        "Vault remains an independent manual export and restore path.",
      ],
    },
    {
      date: "08 Aug 2026",
      version: "v0.19.5",
      phase: "artifacts",
      title: "Files & Artifact Workspace",
      summary: "Files and artifacts become first-class workspace inputs through bounded text extraction, artifact schema v2, and conversation/run links.",
      changes: [
        "The composer accepts TXT, Markdown, CSV, JSON, and bounded PDF with local best-effort text extraction and no third-party parser runtime.",
        "Artifact schema v2 adds favorites and source session/run/document links while remaining compatible with v1 data.",
        "Artifact versions remain local and bounded by size and count.",
        "Document ingestion validates MIME/extension, byte budget, character budget, and strips unsafe control characters.",
      ],
    },
    {
      date: "08 Aug 2026",
      version: "v0.19.4",
      phase: "flow",
      title: "Erma Flow 2.0",
      summary: "The read-only agent runtime gains a real bounded multi-round Inspect → Execute → Verify loop without shell access or arbitrary URLs.",
      changes: [
        "The planner can perform up to three sequential tool rounds instead of one.",
        "The global tool-call ceiling increases to six while remaining capped by the selected model capability matrix.",
        "Agent Run Protocol adds step.failed so a partial failure does not erase the whole run state.",
        "The planner must stop once sufficient data exists and always treat tool output as untrusted data.",
      ],
    },
    {
      date: "08 Aug 2026",
      version: "v0.19.3",
      phase: "chat-runtime",
      title: "Chat Runtime 3.0",
      summary: "Long-conversation compaction moves from plain excerpts to structured project memory: goals, decisions, constraints, facts, and open tasks.",
      changes: [
        "A deterministic structured-memory builder is added without another provider call.",
        "Compaction keeps recent messages verbatim while older turns become bounded memory sections.",
        "The token budget still reserves output space and drops memory sections only when necessary.",
        "Memory never stores hidden reasoning and is built only from explicit user/assistant content.",
      ],
    },
    {
      date: "08 Aug 2026",
      version: "v0.19.2",
      phase: "mobile-chat",
      title: "Mobile Chat Pro",
      summary: "Mobile chat is stabilized around the keyboard, safe areas, and touch navigation with fewer layout jumps and better drawer/landscape behavior.",
      changes: [
        "VisualViewport now publishes height, width, offset, and keyboard inset as CSS variables.",
        "Composer and transcript use stable visual-height geometry while the software keyboard is open.",
        "The mobile history drawer can be dismissed with a horizontal swipe while preserving focus and scroll-lock behavior.",
        "Landscape and short-height modes reduce decorative spacing while preserving 44px touch targets.",
      ],
    },
    {
      date: "08 Aug 2026",
      version: "v0.19.1",
      phase: "mobile-shell",
      title: "Mobile Shell 2.0",
      summary: "The public mobile shell and AI workspace adopt one navigation model instead of duplicated top and bottom controls.",
      changes: [
        "The global public header becomes desktop-only; AppDock is the single global navigation surface on phones.",
        "The workspace gets a compact mobile switcher for Chat / Flow / Artifacts / Runs.",
        "Workspace sections switch directly without forcing a return through chat first.",
        "CSS contracts cover safe-area, visual viewport, and compact landscape behavior.",
      ],
    },
    {
      date: "08 Aug 2026",
      version: "v0.19.0",
      phase: "foundation",
      title: "Workspace Evolution Foundation",
      summary: "The new major series starts with one v0.19 release map, invariant documentation, and architecture preparation for mobile/runtime/sync work.",
      changes: [
        "The v0.19.0–v0.19.7 sequence and a shared Updates release-note source are defined.",
        "Release identity is bumped only after the full series is complete so intermediate stages are not presented as the final release.",
        "Existing security boundaries remain: auth, origin checks, read-only tools, bounded request bodies, and release safety gates.",
        "Each stage receives its own commit and regression contract before the next stage begins.",
      ],
    },
  ],
};

export function getWorkspaceEvolutionReleases(locale: Locale): WorkspaceEvolutionRelease[] {
  return RELEASES[locale].map((release) => ({ ...release, changes: [...release.changes] }));
}
