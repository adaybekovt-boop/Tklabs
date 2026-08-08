export type ProductFactsLocale = "ru" | "en";
export type StorageMode = "local" | "synced" | "ephemeral";

export const PRODUCT_FACTS_VERSION = "2026-08-08";
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
  reasoning: {
    hiddenChainOfThoughtReturned: false,
    genericReasoningUsedFlagOnly: true,
  },
  files: {
    accepted: ["txt", "md", "csv", "json", "pdf"] as const,
    pdfExtraction: "best-effort-local-text-extraction",
  },
  ai: {
    productModels: ["Erma Lite", "Erma Core", "Erma Pro"] as const,
    outputsRequireVerification: true,
    fallbacksAreDisclosed: true,
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
      ru: "Ephemeral отключает долговременное сохранение рабочей сессии, но не отменяет передачу запроса провайдеру для генерации.",
      en: "Ephemeral disables durable workspace persistence but does not remove provider transmission required for generation.",
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
