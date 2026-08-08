import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/releases/types";

const RU: PublicReleaseNote[] = [
  {
    date: "08 авг. 2026",
    version: "v0.23.0",
    title: "Math Rendering",
    summary: "LaTeX в ответах Erma теперь проходит нормализацию перед KaTeX и корректно отображается вместо сырого текста.",
    changes: [
      "Добавлена совместимость с модельными разделителями \\[...\\] и \\(...\\) поверх существующих $...$ и $$...$$.",
      "Нормализация не затрагивает fenced code blocks, а математический renderer остаётся lazy-loaded.",
    ],
  },
  {
    date: "08 авг. 2026",
    version: "v0.23.1",
    title: "Erma Alive",
    summary: "Системный характер Erma стал естественнее: меньше ролевых шаблонов, больше адаптации к реальному смыслу разговора.",
    changes: [
      "Практические и технические вопросы остаются прямыми, а философская глубина включается только там, где она действительно уместна.",
      "Убраны обязательные catchphrase и жёсткие ролевые режимы; Erma не заявляет человеческое сознание или личный опыт как факт.",
    ],
  },
  {
    date: "08 авг. 2026",
    version: "v0.23.2",
    title: "Voice Stability",
    summary: "Голосовой ввод больше не накапливает один и тот же финальный speech-result многократно.",
    changes: [
      "Финальные Web Speech сегменты восстанавливаются по result index и дедуплицируются перед записью в composer.",
      "Распознавание по-прежнему выполняет browser/OS speech engine; релиз исправляет assembly дублей, а не обещает новый speech-recognition provider.",
    ],
  },
  {
    date: "08 авг. 2026",
    version: "v0.23.3",
    title: "Erma Vision",
    summary: "В единый composer добавлены фото, камера и вставка скриншотов с автоматическим скрытым multimodal routing.",
    changes: [
      "JPEG/PNG/WebP локально уменьшаются и сжимаются перед отправкой; доступны камера, file/gallery picker и paste.",
      "Изображение автоматически направляется в скрытый NVIDIA vision execution tier и передаётся как реальный multimodal image_url, без нового пользовательского переключателя модели.",
    ],
  },
  {
    date: "08 авг. 2026",
    version: "v0.23.4",
    title: "Erma Alive & Vision — Trust & QA",
    summary: "LaTeX, характер, голос и vision объединены в один bounded multimodal контур с fail-closed поведением и browser regression tests.",
    changes: [
      "Image bytes отделены от текстового prompt, валидируются отдельно и помечаются для модели как untrusted visual data.",
      "Если vision-модель недоступна, Erma не передаёт картинку text-only fallback и не угадывает её содержимое.",
      "Browser Assurance проверяет реальный KaTeX для bracket-style LaTeX и image-only submit после клиентского сжатия.",
      "Product Facts обновлены: фото обрабатываются внешним multimodal provider после локальной подготовки на устройстве.",
    ],
  },
];

const EN: PublicReleaseNote[] = [
  {
    date: "08 Aug 2026",
    version: "v0.23.0",
    title: "Math Rendering",
    summary: "Erma LaTeX output is normalized before KaTeX so formulas render instead of appearing as raw control text.",
    changes: [
      "Added compatibility for model-style \\[...\\] and \\(...\\) delimiters alongside existing $...$ and $$...$$ syntax.",
      "Normalization skips fenced code blocks and the math renderer remains lazy-loaded.",
    ],
  },
  {
    date: "08 Aug 2026",
    version: "v0.23.1",
    title: "Erma Alive",
    summary: "Erma's system character is more natural: fewer rigid roles and more adaptation to the actual meaning of the conversation.",
    changes: [
      "Practical and technical questions remain direct while philosophical depth is used only when the topic genuinely calls for it.",
      "Forced catchphrases and rigid role modes are removed; Erma does not claim human consciousness or personal experience as fact.",
    ],
  },
  {
    date: "08 Aug 2026",
    version: "v0.23.2",
    title: "Voice Stability",
    summary: "Voice input no longer cumulatively appends the same finalized speech result many times.",
    changes: [
      "Final Web Speech segments are reconstructed by result index and de-duplicated before updating the composer.",
      "Recognition still comes from the browser/OS speech engine; this release fixes duplicate assembly rather than claiming a new recognition provider.",
    ],
  },
  {
    date: "08 Aug 2026",
    version: "v0.23.3",
    title: "Erma Vision",
    summary: "Photos, camera capture, and pasted screenshots join the single composer with automatic hidden multimodal routing.",
    changes: [
      "JPEG/PNG/WebP images are resized and compressed locally before transmission; camera, file/gallery picker, and paste are supported.",
      "Images automatically route to a hidden NVIDIA vision execution tier and are sent as real multimodal image_url parts without adding a user model switch.",
    ],
  },
  {
    date: "08 Aug 2026",
    version: "v0.23.4",
    title: "Erma Alive & Vision — Trust & QA",
    summary: "LaTeX, personality, voice, and vision are unified into a bounded multimodal path with fail-closed behavior and browser regression coverage.",
    changes: [
      "Image bytes stay separate from the text prompt, receive dedicated validation, and are marked as untrusted visual data for the model.",
      "If the vision model is unavailable, Erma never hands the image request to a text-only fallback or guesses what the image contains.",
      "Browser Assurance verifies actual KaTeX rendering for bracket-style LaTeX and image-only submission after client compression.",
      "Product Facts now disclose that photos are processed by an external multimodal provider after local device-side preparation.",
    ],
  },
];

export function getErmaAliveReleases(locale: Locale) {
  return (locale === "ru" ? RU : EN).map((entry) => ({ ...entry, changes: [...entry.changes] }));
}