import type { Locale } from "@/lib/i18n";
import type { PublicReleaseNote } from "@/lib/latest-release";

export function getReleaseV0131(locale: Locale): PublicReleaseNote {
  if (locale === "ru") {
    return {
      date: "06 авг. 2026",
      version: "v0.13.1",
      title: "Новый интерфейс AI-чата",
      summary: "AI-чат получил трёхзонный desktop-workspace, компактный мобильный composer, ветвление, версии ответов, сравнение моделей и отдельные панели контекста, файлов и источников.",
      changes: [
        "На компьютере чат разделён на историю и проекты, центральный диалог и закрываемую правую панель контекста.",
        "Поиск, закрепление, автоматические названия, переименование, дублирование и проекты работают в локальном архиве диалогов.",
        "От любого сообщения можно создать отдельную ветку с сохранением связи с исходным разговором.",
        "Повторная генерация создаёт новую версию ответа, а предыдущую версию можно восстановить одним действием.",
        "Ответ выбранной модели можно сравнить со второй моделью рядом, не заменяя основной результат.",
        "Добавлены режимы: обычный ответ, анализ, код, поиск и работа с документом.",
        "Файлы, ссылки-источники, параметры, reasoning и выбор модели собраны в отдельном contextual drawer и мобильном bottom sheet.",
        "Provider, request ID, latency, TTFT, токены и reasoning скрыты в сворачиваемых технических подробностях.",
        "На телефоне основной composer оставляет только плюс, текст, голос и Send/Stop; свайп вправо открывает историю, свайп вниз закрывает панели.",
        "Удержание сообщения открывает Copy, Edit, Retry/New version и Branch; потоковый Stop сохраняет полученный текст.",
        "Длинные таблицы прокручиваются горизонтально, а блоки кода открываются в полноэкранном просмотре.",
        "Переключатель RU/EN остаётся напрямую доступным на мобильных экранах, а релиз полностью опубликован во вкладке «Что нового».",
      ],
    };
  }

  return {
    date: "06 Aug 2026",
    version: "v0.13.1",
    title: "New AI chat interface",
    summary: "AI chat now has a three-zone desktop workspace, a compact mobile composer, branching, answer versions, model comparison, and dedicated context, file, and source panels.",
    changes: [
      "Desktop chat is split into conversation history and projects, the active conversation, and a dismissible context panel.",
      "Search, pinning, automatic titles, rename, duplication, and projects are supported by the local conversation archive.",
      "A new branch can be created from any message while retaining its relationship to the source conversation.",
      "Regeneration creates a new answer version, and the previous saved version can be restored in one action.",
      "An answer can be compared with a second model side by side without replacing the primary result.",
      "Added Standard, Analysis, Code, Search, and Document response modes.",
      "Files, source links, parameters, reasoning controls, and model selection are grouped in a contextual drawer and mobile bottom sheet.",
      "Provider, request ID, latency, TTFT, token counts, and reasoning state are hidden inside collapsible technical details.",
      "The phone composer keeps only plus, message, voice, and Send/Stop; a right swipe opens history and a downward swipe closes panels.",
      "Long-press actions expose Copy, Edit, Retry/New version, and Branch, while streaming Stop keeps the received text.",
      "Wide tables scroll horizontally and code blocks have a dedicated fullscreen viewer.",
      "The RU/EN switch remains directly reachable on mobile screens, and this release is fully documented in What's New.",
    ],
  };
}
