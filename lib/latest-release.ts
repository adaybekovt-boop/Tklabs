import type { Locale } from "@/lib/i18n";

export interface PublicReleaseNote {
  date: string;
  version: string;
  title: string;
  summary: string;
  changes: string[];
}

export function getPreviousReleaseV0110(locale: Locale): PublicReleaseNote {
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

export function getLatestRelease(locale: Locale): PublicReleaseNote {
  if (locale === "ru") {
    return {
      date: "06 авг. 2026",
      version: "v0.11.1",
      title: "Mobile Profile and Releases",
      summary: "Профиль и история обновлений получили отдельные мобильные сценарии: меньше повторов, безопаснее локальные действия и один выбранный релиз вместо длинной ленты.",
      changes: [
        "Мобильный профиль теперь начинается с компактной карточки аккаунта с аватаром, ролью, уровнем AI-доступа и быстрыми переходами в чат, релизы и локальные данные.",
        "Тяжёлая интерактивная membership-карта и повторяющиеся desktop-блоки скрыты на телефоне, но полностью сохранены на больших экранах.",
        "Параметры аккаунта на телефоне собраны в нативный раскрывающийся блок без дополнительного JavaScript и без блокировки вертикального скролла.",
        "Очистка истории и сброс настроек используют двухэтапное подтверждение внутри страницы вместо системного confirm-диалога.",
        "Экспорт, очистка и сброс сообщают результат через доступный aria-live status; destructive-действия можно отменить до второго нажатия.",
        "Мобильные Patch Notes показывают один выбранный релиз, сохраняют поиск и горизонтальный выбор версии, а также добавляют переходы к предыдущему и следующему релизу.",
        "Для релиза доступно системное Share-меню с безопасным clipboard fallback; прямой hash остаётся стабильным для каждой версии.",
        "История v0.11.0 сохранена отдельной записью при публикации v0.11.1, поэтому переход на новую актуальную версию не удаляет предыдущий релиз.",
      ],
    };
  }

  return {
    date: "06 Aug 2026",
    version: "v0.11.1",
    title: "Mobile Profile and Releases",
    summary: "Profile and release history now have dedicated mobile flows with less repetition, safer local actions, and one focused release instead of a long feed.",
    changes: [
      "The mobile profile now starts with a compact account card containing the avatar, role, AI access level, and quick links to chat, releases, and local data.",
      "The heavy interactive membership card and repeated desktop sections are hidden on phones while remaining fully available on larger screens.",
      "Mobile account parameters are grouped in a native disclosure without extra JavaScript or interference with vertical scrolling.",
      "History clearing and settings reset now use in-page two-step confirmation instead of a system confirm dialog.",
      "Export, clearing, and reset operations announce results through an accessible aria-live status, and destructive actions can be cancelled before confirmation.",
      "Mobile Patch Notes show one selected release while retaining search and horizontal version selection, with previous and next release navigation.",
      "Each release supports the system share sheet with a safe clipboard fallback, while stable version hashes remain available for direct links.",
      "The v0.11.0 history entry is preserved separately when v0.11.1 becomes current, so publishing the new release does not remove the previous one.",
    ],
  };
}
