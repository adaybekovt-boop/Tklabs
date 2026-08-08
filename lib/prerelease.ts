import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_CHANNEL, CURRENT_RELEASE_CODENAME, CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import type { PublicReleaseNote } from "@/lib/releases/types";

export interface PreviewReleaseNote extends PublicReleaseNote { channel: "preview"; majorUpdate: true; codename: typeof CURRENT_RELEASE_CODENAME; stability: "beta"; knownIssues: string[]; migrationNotes: string[]; }

const PREVIEW_RELEASE: Record<Locale, PreviewReleaseNote> = {
  ru: {
    date: "08 авг. 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA ALIVE & VISION — Math, Voice, Images & Natural Character",
    summary: "КРУПНОЕ ОБНОВЛЕНИЕ ERMA · ПРЕДВАРИТЕЛЬНАЯ ВЕРСИЯ. v0.23.4 исправляет реальный LaTeX rendering, делает голос Erma естественнее, стабилизирует Web Speech assembly и добавляет автоматический анализ фотографий без новых ручных режимов.",
    changes: [
      "Bracket-style LaTeX из ответов модели нормализуется перед remark-math/KaTeX, поэтому формулы вида \\[\\begin{aligned}...\\end{aligned}\\] больше не показываются сырым текстом.",
      "Характер Erma стал адаптивным: практические ответы остаются прямыми, а философская глубина появляется естественно только в подходящих разговорах — без жёстких ролевых режимов и обязательных фраз.",
      "Web Speech результаты собираются по индексам и дедуплицируются, поэтому один финальный фрагмент больше не размножается многократно в composer.",
      "Через единый + можно выбрать фото/файл, открыть камеру или вставить скриншот; JPEG/PNG/WebP локально уменьшаются и сжимаются перед передачей.",
      "Изображения автоматически направляются в скрытый vision-capable NVIDIA execution tier и передаются как реальные multimodal image_url parts.",
      "Image bytes не смешиваются с текстовым prompt; визуальное содержимое считается untrusted user data и имеет отдельные лимиты/валидацию.",
      "Если vision backend недоступен, Erma fail-closed: не передаёт запрос text-only fallback и не угадывает содержимое фотографии.",
      "Browser Assurance теперь воспроизводит реальный broken-LaTeX сценарий и image-only submit после клиентского сжатия.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Vision использует внешний NVIDIA multimodal endpoint и требует доступности настроенных NVIDIA API keys; on-device image inference не заявляется.",
      "Поддерживаются JPEG/PNG/WebP: максимум два изображения и максимум три вложения всего; изображения ограничены и локально сжимаются перед отправкой.",
      "Голосовой ввод по-прежнему использует Web Speech implementation браузера/ОС. v0.23.4 исправляет дублирование result events, но не заменяет speech-recognition engine провайдера.",
      "Vision request не падает обратно на text-only модель: при недоступном vision backend пользователь получает явное сообщение вместо предположения о картинке.",
      "Релиз улучшает существующий bounded Math/LaTeX path, но deterministic Math Engine остаётся ограниченным набором операций, а не универсальным CAS.",
    ],
    migrationNotes: [
      "Новых D1 migrations в v0.23.4 нет.",
      "Новых production secrets не требуется: vision использует существующие NVIDIA_API_KEY настройки.",
      "Текущий public Erma catalog остаётся из трёх text tiers; vision — скрытый server-owned execution route, а не новый пользовательский model picker.",
      "Product Facts обновлены, чтобы явно раскрывать внешнюю provider processing для отправленных изображений.",
    ],
  },
  en: {
    date: "08 Aug 2026",
    version: CURRENT_RELEASE_VERSION,
    title: "ERMA ALIVE & VISION — Math, Voice, Images & Natural Character",
    summary: "MAJOR ERMA UPDATE · PRE-RELEASE. v0.23.4 fixes real LaTeX rendering, gives Erma a more natural adaptive voice, stabilizes Web Speech assembly, and adds automatic photo understanding without new manual modes.",
    changes: [
      "Bracket-style model LaTeX is normalized before remark-math/KaTeX so output such as \\[\\begin{aligned}...\\end{aligned}\\] renders instead of appearing as raw control text.",
      "Erma's character is adaptive: practical answers stay direct while philosophical depth appears naturally when the conversation calls for it, without rigid role modes or forced catchphrases.",
      "Web Speech results are reconstructed by index and de-duplicated so one finalized segment no longer multiplies in the composer.",
      "The single + flow supports photo/file selection, camera capture, and pasted screenshots; JPEG/PNG/WebP images are resized and compressed locally before transmission.",
      "Images automatically route to a hidden vision-capable NVIDIA execution tier and are sent as real multimodal image_url parts.",
      "Image bytes stay separate from the text prompt; visual content is untrusted user data with dedicated limits and validation.",
      "If the vision backend is unavailable, Erma fails closed instead of handing the request to a text-only fallback and guessing the image contents.",
      "Browser Assurance now reproduces the real broken-LaTeX pattern and image-only submission after client-side compression.",
    ],
    channel: CURRENT_RELEASE_CHANNEL,
    majorUpdate: true,
    codename: CURRENT_RELEASE_CODENAME,
    stability: "beta",
    knownIssues: [
      "Vision uses an external NVIDIA multimodal endpoint and depends on configured NVIDIA API-key availability; no on-device image inference is claimed.",
      "JPEG/PNG/WebP are supported with at most two images and three total attachments; images are bounded and locally compressed before transmission.",
      "Voice input still uses the browser/OS Web Speech implementation. v0.23.4 fixes duplicate result assembly but does not replace the speech-recognition engine.",
      "Vision requests do not fall back to a text-only model: when the vision backend is unavailable the user receives an explicit message instead of an image guess.",
      "The release improves the existing bounded Math/LaTeX path, while the deterministic Math Engine remains a documented limited operation set rather than a universal CAS.",
    ],
    migrationNotes: [
      "v0.23.4 adds no D1 migrations.",
      "No new production secrets are required: vision uses the existing NVIDIA_API_KEY configuration.",
      "The public Erma catalog remains three text tiers; vision is a hidden server-owned execution route rather than a new user-facing model picker.",
      "Product Facts are updated to disclose external provider processing for submitted images.",
    ],
  },
};

export function getPreviewRelease(locale: Locale): PreviewReleaseNote {
  const release = PREVIEW_RELEASE[locale];
  return { ...release, changes: [...release.changes], knownIssues: [...release.knownIssues], migrationNotes: [...release.migrationNotes] };
}