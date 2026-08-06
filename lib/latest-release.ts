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
    };
  }

  return {
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
  };
}
