export type DocumentationEntry = {
  id: string;
  href: string;
  title: { ru: string; en: string };
  summary: { ru: string; en: string };
  keywords: string[];
};

/** Fixed internal index. Tool calls can never choose an arbitrary URL. */
export const DOCUMENTATION_INDEX: readonly DocumentationEntry[] = [
  {
    id: "documentation",
    href: "/documentation",
    title: { ru: "Документация TK LAB", en: "TK LAB documentation" },
    summary: {
      ru: "Обзор приложения, AI-чата, моделей, приватности и основных пользовательских сценариев.",
      en: "Overview of the application, AI chat, models, privacy, and primary user workflows.",
    },
    keywords: ["documentation", "docs", "документация", "инструкция", "guide", "help", "справка"],
  },
  {
    id: "models",
    href: "/models",
    title: { ru: "Каталог моделей Erma", en: "Erma model catalog" },
    summary: {
      ru: "Доступные уровни Erma, назначение моделей, reasoning и поддерживаемые возможности.",
      en: "Available Erma tiers, model purposes, reasoning, and supported capabilities.",
    },
    keywords: ["models", "model", "модели", "erma", "reasoning", "tools", "capabilities"],
  },
  {
    id: "patch-notes",
    href: "/patch-notes",
    title: { ru: "Что нового", en: "What's new" },
    summary: {
      ru: "История версий TK LAB, изменения интерфейса, AI-функций и инфраструктуры.",
      en: "TK LAB release history covering interface, AI, and infrastructure changes.",
    },
    keywords: ["patch", "release", "version", "релиз", "версия", "обновление", "что нового"],
  },
  {
    id: "status",
    href: "/status",
    title: { ru: "Статус сервисов", en: "Service status" },
    summary: {
      ru: "Текущее состояние обязательных сервисов и AI-провайдеров TK LAB.",
      en: "Current state of required TK LAB services and AI providers.",
    },
    keywords: ["status", "service", "health", "статус", "сервис", "доступность", "работает"],
  },
  {
    id: "truth",
    href: "/truth",
    title: { ru: "Приватность и границы системы", en: "Privacy and system boundaries" },
    summary: {
      ru: "Какие данные остаются на устройстве, что отправляется AI-провайдерам и какие ограничения есть у приложения.",
      en: "Which data stays on-device, what is sent to AI providers, and the application's limitations.",
    },
    keywords: ["privacy", "security", "local", "приватность", "безопасность", "данные", "локально"],
  },
  {
    id: "playground",
    href: "/playground",
    title: { ru: "AI-чат", en: "AI chat" },
    summary: {
      ru: "Рабочее пространство диалогов, файлы, режимы ответа, ветвление и локальный архив.",
      en: "Conversation workspace, files, response modes, branching, and local archive.",
    },
    keywords: ["chat", "playground", "чат", "диалог", "archive", "архив", "branch", "files"],
  },
] as const;
