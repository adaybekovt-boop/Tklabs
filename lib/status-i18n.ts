import type { Dictionary, Locale } from "@/lib/i18n";

type StatusCopy = Dictionary["status"];
export type StatusDictionary = Pick<Dictionary, "status">;

const dictionaries: Record<Locale, StatusCopy> = {
  ru: {
    eyebrow: "Мониторинг платформы",
    title: "Статус системы",
    intro: "Текущее состояние ключевых сервисов и последнее зарегистрированное измерение доступности.",
    allWorking: "Все системы работают",
    checking: "Проверяем системы",
    partial: "Часть систем требует внимания",
    down: "Есть недоступный сервис",
    checked: "Ожидание live-проверки",
    lastChecked: "Последняя проверка",
    refresh: "Обновить",
    infrastructure: "Основная инфраструктура",
    working: "Работает",
    degraded: "Внимание",
    unavailable: "Недоступно",
    notConfigured: "Не настроено",
    incidents: "Журнал инцидентов",
    historyNote: "Исторический incident feed пока не подключён. Эта страница показывает только live-проверку текущих безопасных сигналов и не имитирует uptime или прошлые события.",
    services: ["Основной inference-сервис", "Слой авторизации", "Сервис доступа аккаунта", "Модельный маршрут Clodex"],
    ms: "мс",
  },
  en: {
    eyebrow: "Platform monitoring",
    title: "System status",
    intro: "The current state of key services and the latest recorded availability measurement.",
    allWorking: "All systems operational",
    checking: "Checking systems",
    partial: "Some systems need attention",
    down: "A service is unavailable",
    checked: "Awaiting live check",
    lastChecked: "Last checked",
    refresh: "Refresh",
    infrastructure: "Core infrastructure",
    working: "Operational",
    degraded: "Attention",
    unavailable: "Unavailable",
    notConfigured: "Not configured",
    incidents: "Incident log",
    historyNote: "A historical incident feed is not connected yet. This page only shows live checks of safe current signals and does not invent uptime or past events.",
    services: ["Primary inference service", "Authentication layer", "Account access service", "Clodex model route"],
    ms: "ms",
  },
};

export function getStatusDictionary(locale: Locale): StatusDictionary {
  return { status: dictionaries[locale] };
}
