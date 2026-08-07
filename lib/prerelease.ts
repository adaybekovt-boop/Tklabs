import type { Locale } from "@/lib/i18n";
import {
  CURRENT_RELEASE_CHANNEL,
  CURRENT_RELEASE_CODENAME,
  CURRENT_RELEASE_VERSION,
} from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

export interface PreviewReleaseNote extends PublicReleaseNote {
  channel: "preview";
  majorUpdate: true;
  codename: "Profile Studio";
  stability: "beta";
  knownIssues: string[];
  migrationNotes: string[];
}

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "07 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "PROFILE STUDIO — Account Hub & Navigation Clarity",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. Профиль полностью переработан для телефонов и ПК, нижняя навигация стала понятнее, а локальные данные, Workspace Vault и доступы получили более ясную структуру.",
    changes: [
      "Мобильный профиль получил новый визуальный hero, крупный avatar block, статус аккаунта, текущий релиз и понятную сетку быстрых действий.",
      "Карта участника теперь полноценно отображается и работает на телефонах, сохраняя tilt, flip, reduced-motion и доступность с клавиатуры.",
      "Desktop-профиль перестроен в последовательный account hub со структурой Membership, Overview, Access & Limits и On-device Data.",
      "Workspace Vault вынесен в отдельное заметное действие, а экспорт только диалогов больше не выглядит как полный бэкап рабочего пространства.",
      "Нижняя мобильная навигация получила центральный AI-чат, более ясные active states, описания разделов и отдельный пункт Workspace Vault.",
      "Дублирующий пункт Access удалён из мобильного меню; legacy URL сохраняется, но больше не путает пользователя рядом с Models.",
      "Подтверждения очистки и сброса автоматически истекают, export download стал надёжнее в Safari-подобных браузерах, а timer cleanup предотвращает утечки после ухода со страницы.",
      "Service Worker cache namespace поднят до `tklabs-v0.16.7-static`, чтобы после слияния старые assets были удалены при активации.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Профиль использует локальные браузерные данные и не синхронизирует историю или настройки между устройствами без ручного Workspace Vault export/import.",
      "3D tilt карты отключается для touch pointer и reduced-motion, поэтому визуальный эффект зависит от устройства и системных настроек.",
      "Нижняя навигация остаётся скрытой на desktop layout и не заменяет верхнюю навигацию на широких экранах.",
    ],
    migrationNotes: [
      "Существующие права доступа, диалоги, артефакты и Workspace Vault schema не изменяются.",
      "Старый mobile profile release-link на v0.11.1 удалён; профиль теперь показывает фактический CURRENT_RELEASE_VERSION.",
      "Service Worker cache namespace обновлён до `tklabs-v0.16.7-static`; stale caches удаляются при активации нового worker.",
    ],
  },
  en: {
    date: "07 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "PROFILE STUDIO — Account Hub & Navigation Clarity",
    summary: "MAJOR UPDATE · PRE-RELEASE. Profile has been rebuilt for phones and desktop, bottom navigation is clearer, and access, local data, and Workspace Vault now follow a more understandable structure.",
    changes: [
      "The mobile profile gained a new visual hero, larger avatar block, account status, current release, and a clear quick-action grid.",
      "The membership card now works on phones while preserving tilt, flip, reduced-motion behavior, and keyboard accessibility.",
      "The desktop profile is reorganized into a consistent account hub with Membership, Overview, Access & Limits, and On-device Data sections.",
      "Workspace Vault is now a prominent action, while conversation-only export no longer looks like a complete workspace backup.",
      "Mobile bottom navigation gained a central AI chat action, clearer active states, section descriptions, and a dedicated Workspace Vault entry.",
      "The duplicate Access item was removed from the mobile menu; the legacy URL remains available without competing with Models in navigation.",
      "Clear/reset confirmations now expire automatically, downloads are more reliable in Safari-like browsers, and timer cleanup prevents stale updates after leaving the page.",
      "The Service Worker cache namespace is bumped to `tklabs-v0.16.7-static` so outdated assets are removed after merge.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Profile data remains browser-local and does not synchronize across devices without a manual Workspace Vault export and import.",
      "Card tilt is disabled for touch pointers and reduced-motion settings, so the visual effect depends on the device and operating-system preferences.",
      "Bottom navigation remains mobile-only and does not replace the desktop header on wide layouts.",
    ],
    migrationNotes: [
      "Existing access rights, conversations, artifacts, and the Workspace Vault schema are unchanged.",
      "The old v0.11.1 mobile-profile release link is removed; profile now displays the real CURRENT_RELEASE_VERSION.",
      "The Service Worker cache namespace is updated to `tklabs-v0.16.7-static`, deleting stale caches when the new worker activates.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote {
  const release = PREVIEW_RELEASE[locale];
  return {
    ...release,
    changes: [...release.changes],
    knownIssues: [...release.knownIssues],
    migrationNotes: [...release.migrationNotes],
  };
}
