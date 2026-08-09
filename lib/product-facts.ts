export type ProductFactsLocale = "ru" | "en";
export type StorageMode = "local" | "synced" | "ephemeral";

export const PRODUCT_FACTS_VERSION = "2026-08-09";
export const PRODUCT_POSITIONING = {
  ru: "Local-first AI workspace с явным контролем данных.",
  en: "A local-first AI workspace with explicit data control.",
} as const;

export const PRODUCT_FACTS = {
  storageModes: ["local", "synced", "ephemeral"] as const satisfies readonly StorageMode[],
  localArchive: {
    default: true,
    location: "browser",
    serverBackup: false,
  },
  workspaceSync: {
    optional: true,
    automatic: false,
    serverStored: true,
    encryption: "AES-GCM encrypted at rest",
    endToEndEncrypted: false,
  },
  providerProcessing: {
    requiredForGeneration: true,
    promptLeavesDevice: true,
    attachmentsLeaveDeviceWhenSent: true,
    providerClass: "external-model-provider",
  },
  webGrounding: {
    automaticForCurrentAndHighRiskFacts: true,
    queryMinimizedBeforeSearch: true,
    preferredProvider: "Google Search grounding",
    fallbacks: ["Google Programmable Search for existing customers", "Brave Search"] as const,
    fullConversationSentToSearchProvider: false,
    directGoogleGroundedAnswers: true,
    directGoogleAnswerRewrittenByErma: false,
    googleSearchSuggestionsDisplayedWhenReturned: true,
    openedPagesTreatedAsUntrustedData: true,
  },
  reasoning: {
    hiddenChainOfThoughtReturned: false,
    genericReasoningUsedFlagOnly: true,
  },
  files: {
    accepted: ["txt", "md", "csv", "json", "pdf", "jpg", "jpeg", "png", "webp"] as const,
    pdfExtraction: "best-effort-local-text-extraction",
    imagePreparation: "local-resize-and-compression-before-provider-processing",
    imageUnderstanding: "external-multimodal-model-provider",
  },
  ai: {
    productModels: ["Erma Lite", "Erma Core", "Erma Pro"] as const,
    outputsRequireVerification: true,
    fallbacksAreDisclosed: true,
    imageRouting: "automatic-hidden-vision-tier",
    exactFactRouting: "automatic-grounded-core-or-higher-tier",
  },
  account: {
    authentication: "Google OAuth via Auth.js",
    termsConsent: "D1 versioned consent",
  },
} as const;

export const PRODUCT_DATA_ROUTES = [
  {
    id: "local-workspace",
    storageMode: "local" as const,
    route: ["device"],
    note: {
      ru: "Архив хранится на устройстве. Отправленный AI-запрос всё равно обрабатывается сервером и модельным провайдером.",
      en: "The archive stays on the device. A submitted AI request is still processed by the server and model provider.",
    },
  },
  {
    id: "synced-workspace",
    storageMode: "synced" as const,
    route: ["device", "TK LAB Worker", "D1 encrypted snapshot"],
    note: {
      ru: "Синхронизация включается пользователем вручную и не является end-to-end encryption.",
      en: "Sync is enabled manually by the user and is not end-to-end encryption.",
    },
  },
  {
    id: "ai-generation",
    storageMode: "ephemeral" as const,
    route: ["device", "TK LAB Worker", "external model provider"],
    note: {
      ru: "Ephemeral отключает долговременное сохранение рабочей сессии, но не отменяет передачу запроса, текста документов или прикреплённых изображений провайдеру для генерации.",
      en: "Ephemeral disables durable workspace persistence but does not remove provider transmission of the request, document text, or attached images required for generation.",
    },
  },
  {
    id: "web-grounding",
    storageMode: "ephemeral" as const,
    route: ["device", "TK LAB Worker", "Google Search grounding or fallback search provider", "public web sources"],
    note: {
      ru: "Для подходящих фактических веб-запросов Worker отправляет Google минимизированную текущую реплику, а не полную историю чата. Если Google возвращает полноценный grounded-ответ с атрибуцией, Erma показывает этот текст напрямую без повторного пересказа NVIDIA и отображает связанные Google Search Suggestions и источники. При недоступности Google используется прежний проверяемый поисковый fallback.",
      en: "For eligible factual web requests, the Worker sends Google the minimized current turn rather than the full chat history. When Google returns a complete grounded answer with attribution, Erma displays that text directly without NVIDIA rewriting and shows the associated Google Search Suggestions and sources. The previous verifiable search fallback remains available when Google is unavailable.",
    },
  },
] as const;

export function getProductPositioning(locale: ProductFactsLocale) {
  return PRODUCT_POSITIONING[locale];
}

export function getProductDataRoutes(locale: ProductFactsLocale) {
  return PRODUCT_DATA_ROUTES.map((entry) => ({
    ...entry,
    note: entry.note[locale],
  }));
}