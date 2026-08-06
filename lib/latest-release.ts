import type { Locale } from "@/lib/i18n";

export interface PublicReleaseNote {
  date: string;
  version: string;
  title: string;
  summary: string;
  changes: string[];
}

export function getLatestRelease(locale: Locale): PublicReleaseNote {
  if (locale === "ru") {
    return {
      date: "06 авг. 2026",
      version: "v0.10.0",
      title: "Интерактивные карты профиля и чистый интерфейс",
      summary: "Профиль получил светящиеся 3D-карты, а страницы стали спокойнее: меньше повторов бренда и удобнее просмотр истории обновлений.",
      changes: [
        "Карточку профиля можно наклонять указателем и переворачивать нажатием или клавиатурой; reduced motion отключает объёмную анимацию.",
        "Администраторские аккаунты получают Platinum Founders Edition с дуэтом TK × Thomas, остальные авторизованные пользователи — Gold Member Edition.",
        "Цвет и название карты остаются только визуальным представлением: права по-прежнему проверяются сервером через отдельные admin и AI-доступы.",
        "Убраны повторяющиеся логотипы и подписи в нижней части страниц, footer и карточках команды — основной wordmark остаётся в верхней навигации.",
        "Patch Notes получили поиск, навигацию по версиям и компактные раскрывающиеся записи.",
        "Профиль стал компактнее: статус AI, Clodex, роль и локальный архив собраны вокруг основной карты без дублирующего портрета.",
      ],
    };
  }

  return {
    date: "06 Aug 2026",
    version: "v0.10.0",
    title: "Interactive profile cards and cleaner interface",
    summary: "Profiles now use luminous 3D membership cards, while the wider site reduces repeated branding and makes release history easier to browse.",
    changes: [
      "The profile card tilts with the pointer and flips by click or keyboard; reduced-motion preferences disable the 3D movement.",
      "Administrator accounts receive the Platinum Founders Edition with the TK × Thomas duo, while other authenticated users receive the Gold Member Edition.",
      "Card color and tier remain presentational only; authorization continues to use separate server-side admin and AI access checks.",
      "Repeated wordmarks and labels were removed from lower-page sections, the footer, and team cards while the primary header wordmark remains.",
      "Patch Notes now include search, version navigation, and compact expandable release entries.",
      "The profile layout is more focused, placing AI, Clodex, role, and local archive status around the primary membership card.",
    ],
  };
}
