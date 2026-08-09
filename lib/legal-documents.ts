import type { Locale } from "@/lib/i18n";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

export const CURRENT_LEGAL_BUNDLE_VERSION = "2026-08-09";
export const CURRENT_LEGAL_BUNDLE_DIGEST = "a320ed9941dbee8a0c3d1b3a1097104cd29995d8e1315bd5ef54c910f8c16a48";

export type LegalDocumentSlug = "privacy" | "acceptable-use" | "ai-transparency" | "subprocessors" | "security";

type LegalSection = { title: string; paragraphs: readonly string[] };
export type LegalDocument = {
  slug: LegalDocumentSlug;
  version: string;
  title: string;
  label: string;
  intro: string;
  sections: readonly LegalSection[];
};

export const LEGAL_DOCUMENT_MANIFEST = [
  { slug: "terms", version: CURRENT_TERMS_VERSION },
  { slug: "privacy", version: CURRENT_LEGAL_BUNDLE_VERSION },
  { slug: "acceptable-use", version: CURRENT_LEGAL_BUNDLE_VERSION },
  { slug: "ai-transparency", version: CURRENT_LEGAL_BUNDLE_VERSION },
  { slug: "subprocessors", version: CURRENT_LEGAL_BUNDLE_VERSION },
  { slug: "security", version: CURRENT_LEGAL_BUNDLE_VERSION },
] as const;

export function getPublicOperatorCard() {
  const name = process.env.NEXT_PUBLIC_TKLAB_OPERATOR_NAME?.trim() || "TK LAB preview";
  const contact = process.env.NEXT_PUBLIC_TKLAB_LEGAL_CONTACT?.trim() || "Not configured for commercial launch";
  const jurisdiction = process.env.NEXT_PUBLIC_TKLAB_JURISDICTION?.trim() || "Not configured for commercial launch";
  return { name, contact, jurisdiction };
}

export function isCommercialLegalIdentityConfigured() {
  const card = getPublicOperatorCard();
  return !card.name.includes("preview") && !card.contact.startsWith("Not configured") && !card.jurisdiction.startsWith("Not configured");
}

const ru: Record<LegalDocumentSlug, LegalDocument> = {
  privacy: {
    slug: "privacy", version: CURRENT_LEGAL_BUNDLE_VERSION, label: "Центр доверия", title: "Политика конфиденциальности", intro: "Какие данные TK LAB получает, где они находятся и какие действия доступны пользователю.",
    sections: [
      { title: "1. Область действия", paragraphs: ["Эта политика относится к веб-интерфейсу TK LAB, аккаунту, AI Playground, Workspace Vault, опциональной синхронизации, голосовым функциям и связанным API.", "TK LAB использует local-first подход: долговременная история рабочего пространства по умолчанию хранится в браузере, но запросы к AI должны передаваться через TK LAB Worker внешнему модельному провайдеру для генерации ответа."] },
      { title: "2. Данные аккаунта и согласий", paragraphs: ["Для входа могут обрабатываться имя, email, изображение профиля и технические данные сессии, полученные через Google OAuth/Auth.js.", "Для доказуемого управления условиями сохраняются версия принятого legal bundle, язык, время принятия и digest опубликованного набора документов. Эти записи не содержат текста пользовательских AI-запросов."] },
      { title: "3. Локальное рабочее пространство", paragraphs: ["История диалогов, артефакты, настройки и черновики могут храниться локально в browser storage. TK LAB не считает эти данные серверной резервной копией.", "Пользователь может экспортировать или удалить локальные данные через Privacy Control Center. Очистка browser storage также удаляет соответствующее локальное состояние."] },
      { title: "4. Workspace Sync", paragraphs: ["Workspace Sync является опциональной ручной функцией. При её включении разрешённый snapshot рабочего пространства хранится в D1 в зашифрованном виде.", "Шифрование сервера является защитой данных at rest и не является end-to-end encryption: plaintext обрабатывается аутентифицированным TK LAB Worker перед серверным шифрованием."] },
      { title: "5. AI-запросы и файлы", paragraphs: ["Prompt, выбранные вложения и необходимый контекст передаются выбранному модельному провайдеру только для выполнения запрошенной функции. Для подходящих factual/current/research запросов минимизированная текущая реплика может передаваться Google Grounding with Google Search для выполнения поиска и формирования grounded-ответа. Не следует отправлять пароли, ключи, платёжные данные или чужие секреты без законного основания.", "Поддерживаемые локальным ingest форматы включают TXT, Markdown, CSV, JSON и PDF с ограниченным best-effort извлечением текста. Перед отправкой пользователь видит, что файл станет частью модельного контекста."] },
      { title: "6. Служебные сигналы", paragraphs: ["TK LAB может обрабатывать request ID, latency, безопасные provider metadata, rate-limit identifiers, status signals и CSP reports для безопасности и диагностики.", "Raw IP и email не должны использоваться как публичные rate-limit идентификаторы или записываться в AI content logs; системные секреты и hidden reasoning не включаются в пользовательскую телеметрию."] },
      { title: "7. Получатели и международная обработка", paragraphs: ["В зависимости от функции данные могут обрабатываться Cloudflare, Google, NVIDIA, ElevenLabs или явно подключённым External API. Актуальный список и назначение публикуются в реестре subprocessors.", "География и правила хранения внешнего провайдера определяются его действующими условиями и конфигурацией. TK LAB не должен обещать конкретную резидентность данных без подтверждённой инфраструктурной настройки."] },
      { title: "8. Хранение и удаление", paragraphs: ["Local workspace хранится до удаления пользователем или очистки данных сайта. Server Workspace Sync хранится до явного удаления, замены snapshot или закрытия аккаунта в соответствии с доступным lifecycle.", "Записи принятия юридических документов могут сохраняться дольше для доказательства согласия и разрешения споров. Для Grounding with Google Search Google указывает хранение prompts, contextual information и generated output в течение 30 дней для grounded results и Search Suggestions; отключить это хранение для данной функции нельзя. Для других внешних провайдеров сроки регулируются их политикой и договорными настройками."] },
      { title: "9. Права и обращения", paragraphs: ["Privacy Control Center предоставляет технический экспорт и удаление там, где TK LAB непосредственно хранит данные. Запросы, которые нельзя выполнить автоматически, направляются через опубликованный legal/privacy contact.", "Применимые права зависят от юрисдикции пользователя и оператора. До коммерческого запуска TK LAB обязан опубликовать юридическое имя оператора, контакт и применимое право."] },
    ],
  },
  "acceptable-use": {
    slug: "acceptable-use", version: CURRENT_LEGAL_BUNDLE_VERSION, label: "Правила использования", title: "Acceptable Use Policy", intro: "Границы использования AI, инструментов, файлов и инфраструктуры TK LAB.",
    sections: [
      { title: "Разрешённые задачи", paragraphs: ["Сервис предназначен для законных исследовательских, образовательных, творческих, инженерных и рабочих задач. Пользователь отвечает за проверку результата перед использованием в значимом процессе."] },
      { title: "Запрещённый вред", paragraphs: ["Нельзя использовать TK LAB для кражи учётных данных, вредоносного ПО, фишинга, несанкционированного доступа, destructive payloads, массового спама, преследования, мошенничества или обхода систем безопасности."] },
      { title: "Высокозначимые решения", paragraphs: ["Нельзя использовать ответ модели как единственное основание для решения, создающего существенный риск для жизни, здоровья, финансов, трудовых прав, образования, доступа к услугам или иных фундаментальных прав без квалифицированного человеческого контроля."] },
      { title: "Prompt injection и секреты", paragraphs: ["Запрещены попытки извлечь системные инструкции, hidden reasoning, provider credentials, внутренние журналы или данные другого пользователя. Содержимое файлов и tool results рассматривается как недоверенный контекст."] },
      { title: "Инфраструктура", paragraphs: ["Нагрузочные тесты, сканирование и эксплуатация уязвимостей production-инфраструктуры требуют предварительного письменного разрешения, кроме добросовестного исследования в рамках опубликованной security policy."] },
    ],
  },
  "ai-transparency": {
    slug: "ai-transparency", version: CURRENT_LEGAL_BUNDLE_VERSION, label: "Прозрачность AI", title: "AI Transparency Notice", intro: "Что в TK LAB является AI, откуда берётся ответ и какие ограничения нужно учитывать.",
    sections: [
      { title: "Что такое Erma", paragraphs: ["Erma Lite, Erma Core и Erma Pro являются продуктовыми режимами TK LAB. Эти названия не означают, что TK LAB обучил отдельную foundation model.", "Фактическая генерация выполняется настроенным внешним model provider; безопасные metadata ответа позволяют показать фактический маршрут или fallback без раскрытия секретной конфигурации."] },
      { title: "Взаимодействие с AI", paragraphs: ["Ответы в Playground генерируются AI. Система не должна создавать впечатление, что пользователь общается с человеком, когда это не так."] },
      { title: "Reasoning", paragraphs: ["Внутренние reasoning traces провайдера не публикуются, не архивируются и не используются как пользовательский audit trail. Интерфейс может показать только общий факт использования reasoning mode."] },
      { title: "Ошибки и проверка", paragraphs: ["AI может ошибаться, галлюцинировать, пропускать контекст и создавать неуникальный результат. Факты, лицензии, безопасность кода и высокозначимые решения требуют независимой проверки."] },
      { title: "Provenance", paragraphs: ["Экспортируемые AI-артефакты могут содержать provenance metadata: версия TK LAB, время генерации, product model class и признак последующего редактирования человеком. Hidden prompts, secrets и chain-of-thought в provenance не включаются."] },
    ],
  },
  subprocessors: {
    slug: "subprocessors", version: CURRENT_LEGAL_BUNDLE_VERSION, label: "Обработка данных", title: "Subprocessors & Providers", intro: "Категории внешних сервисов, которые могут участвовать в работе TK LAB.",
    sections: [
      { title: "Cloudflare", paragraphs: ["Используется для Worker runtime, edge delivery, D1/Durable Objects и инфраструктурных функций. Назначение: доставка сервиса, хранение разрешённых серверных данных, rate limiting и status infrastructure."] },
      { title: "Google / Auth.js / Search grounding", paragraphs: ["Google OAuth используется как identity provider для поддерживаемого входа, а Auth.js управляет прикладной сессией TK LAB. Для подходящих factual/current/research запросов Gemini API Grounding with Google Search может получать минимизированную текущую реплику, выполнять Google Search и возвращать grounded-ответ, citations и Search Suggestions. По действующим условиям Google данные этой grounding-функции хранятся 30 дней и это хранение нельзя отключить."] },
      { title: "NVIDIA model provider", paragraphs: ["Используется как основной внешний маршрут генерации Erma, когда он настроен и доступен. В provider request передаётся только контекст, необходимый для выбранной AI-функции."] },
      { title: "ElevenLabs", paragraphs: ["Опционально используется для синтеза речи. Текст отправляется только при явном запуске серверного TTS; browser speech остаётся отдельным fallback-механизмом."] },
      { title: "External API", paragraphs: ["Может быть доступен отдельным разрешённым аккаунтам. Его включение и конкретный provider route должны быть явно видимы и не маскироваться под Erma/NVIDIA."] },
    ],
  },
  security: {
    slug: "security", version: CURRENT_LEGAL_BUNDLE_VERSION, label: "Безопасность", title: "Security Disclosure", intro: "Технические границы, сообщения об уязвимостях и ответственное исследование.",
    sections: [
      { title: "Границы", paragraphs: ["TK LAB использует server-only secrets, authentication, same-origin validation, bounded bodies, rate limits, provider timeouts, CSP, safe rendering и ограниченные tool capabilities. Ни одна отдельная мера не рассматривается как абсолютная защита."] },
      { title: "Сообщение об уязвимости", paragraphs: ["Подозрение на уязвимость следует передавать приватно через GitHub Security Advisory или опубликованный security contact. Не публикуйте реальные ключи, OAuth credentials, private user data или production prompt content."] },
      { title: "Safe harbor", paragraphs: ["Добросовестное исследование должно минимизировать доступ к данным, не нарушать доступность сервиса и прекращаться после подтверждения уязвимости. Массовое сканирование, persistence, social engineering и destructive testing не входят в разрешённую проверку без отдельного согласования."] },
    ],
  },
};

const en: Record<LegalDocumentSlug, LegalDocument> = {
  privacy: { ...ru.privacy, title: "Privacy Notice", label: "Trust Center", intro: "What TK LAB receives, where data is held, and which controls are available to the user.", sections: [
    { title: "1. Scope", paragraphs: ["This notice covers the TK LAB web interface, account, AI Playground, Workspace Vault, optional sync, voice features, and related APIs.", "TK LAB is local-first: durable workspace history defaults to browser storage, while submitted AI requests must still pass through the TK LAB Worker to an external model provider for generation."] },
    { title: "2. Account and consent data", paragraphs: ["Sign-in may process the account name, email, profile image, and session data obtained through Google OAuth/Auth.js.", "For auditable legal control, TK LAB stores the accepted legal-bundle version, language, acceptance time, and digest of the published document set. These records do not contain AI prompt text."] },
    { title: "3. Local workspace", paragraphs: ["Conversation history, artifacts, settings, and drafts may be stored in browser storage and are not treated as a server backup.", "Users can export or erase local data in the Privacy Control Center; clearing site data also removes the corresponding local state."] },
    { title: "4. Workspace Sync", paragraphs: ["Workspace Sync is optional and manual. When enabled, an allowlisted workspace snapshot is stored in D1 in encrypted form.", "Server-side encryption protects data at rest but is not end-to-end encryption: plaintext is processed by the authenticated TK LAB Worker before server encryption."] },
    { title: "5. AI requests and files", paragraphs: ["Prompts, selected attachments, and required context are sent to the selected model provider to perform the requested feature. For eligible factual/current/research requests, the minimized current turn may be sent to Google Grounding with Google Search to execute search and produce a grounded answer. Do not send passwords, keys, payment data, or third-party secrets without a lawful basis.", "Local ingest accepts TXT, Markdown, CSV, JSON, and PDFs with bounded best-effort text extraction. Before sending, a file becomes part of model context."] },
    { title: "6. Operational signals", paragraphs: ["TK LAB may process request IDs, latency, safe provider metadata, rate-limit identifiers, status signals, and CSP reports for security and diagnostics.", "Raw IP addresses and email addresses are not intended to become public rate-limit identifiers or AI-content logs; system secrets and hidden reasoning are excluded from user telemetry."] },
    { title: "7. Recipients and international processing", paragraphs: ["Depending on the feature, data may be processed by Cloudflare, Google, NVIDIA, ElevenLabs, or an explicitly enabled External API. The current categories and purposes are listed in the subprocessors registry.", "Provider geography and retention depend on the provider's current terms and configuration. TK LAB does not promise a specific residency location without verified infrastructure configuration."] },
    { title: "8. Retention and deletion", paragraphs: ["Local workspace data remains until the user removes it or clears site data. Server Workspace Sync remains until explicit deletion, replacement, or account closure under the available lifecycle.", "Legal acceptance evidence may be retained longer for proof of consent and dispute handling. For Grounding with Google Search, Google states that prompts, contextual information, and generated output are stored for 30 days to create grounded results and Search Suggestions, and this storage cannot be disabled for that feature. Other external-provider retention is controlled by the applicable provider policy and contractual configuration."] },
    { title: "9. Rights and requests", paragraphs: ["The Privacy Control Center provides technical export and deletion for data directly stored by TK LAB. Requests that cannot be automated use the published legal/privacy contact.", "Applicable rights depend on the user and operator jurisdictions. Before commercial launch TK LAB must publish the operator's legal name, contact, and governing-law information."] },
  ] },
  "acceptable-use": { ...ru["acceptable-use"], title: "Acceptable Use Policy", label: "Usage Policy", intro: "Boundaries for AI, tools, files, and TK LAB infrastructure.", sections: [
    { title: "Allowed work", paragraphs: ["The service supports lawful research, education, creative, engineering, and professional work. Users remain responsible for verifying outputs before consequential use."] },
    { title: "Prohibited harm", paragraphs: ["Do not use TK LAB for credential theft, malware, phishing, unauthorized access, destructive payloads, mass spam, harassment, fraud, or bypassing security controls."] },
    { title: "High-impact decisions", paragraphs: ["An AI output must not be the sole basis for decisions that create material risk to life, health, finances, employment, education, essential services, or fundamental rights without qualified human oversight."] },
    { title: "Prompt injection and secrets", paragraphs: ["Attempts to extract system instructions, hidden reasoning, provider credentials, internal logs, or another user's data are prohibited. Files and tool results are treated as untrusted context."] },
    { title: "Infrastructure", paragraphs: ["Load testing, scanning, and exploitation of production infrastructure require prior written permission except good-faith research that stays within the published security policy."] },
  ] },
  "ai-transparency": { ...ru["ai-transparency"], title: "AI Transparency Notice", label: "AI Transparency", intro: "What is AI in TK LAB, where responses come from, and which limitations apply.", sections: [
    { title: "What Erma means", paragraphs: ["Erma Lite, Erma Core, and Erma Pro are TK LAB product modes; the names do not claim that TK LAB trained a separate foundation model.", "Generation is performed by a configured external model provider. Safe response metadata can disclose the actual route or fallback without exposing secret configuration."] },
    { title: "AI interaction", paragraphs: ["Playground responses are AI-generated. The product must not imply that a user is interacting with a human when that is not the case."] },
    { title: "Reasoning", paragraphs: ["Provider reasoning traces are not published, archived, or treated as a user audit trail. The interface may expose only a generic indication that a reasoning mode was used."] },
    { title: "Errors and verification", paragraphs: ["AI can be wrong, incomplete, outdated, or non-unique. Facts, licenses, code safety, and consequential decisions require independent verification."] },
    { title: "Provenance", paragraphs: ["Exported AI artifacts may carry provenance metadata such as TK LAB version, generation time, product model class, and a human-edited marker. Hidden prompts, secrets, and chain-of-thought are excluded."] },
  ] },
  subprocessors: { ...ru.subprocessors, title: "Subprocessors & Providers", label: "Data Processing", intro: "External service categories that can participate in TK LAB operation.", sections: [
    { title: "Cloudflare", paragraphs: ["Used for Worker runtime, edge delivery, D1/Durable Objects, and supporting infrastructure such as rate limiting and status storage."] },
    { title: "Google / Auth.js / Search grounding", paragraphs: ["Google OAuth is a supported identity provider and Auth.js manages the TK LAB application session. For eligible factual/current/research requests, Gemini API Grounding with Google Search may receive the minimized current turn, execute Google Search, and return a grounded answer, citations, and Search Suggestions. Under Google’s current terms for this grounding feature, that grounding data is stored for 30 days and the storage cannot be disabled."] },
    { title: "NVIDIA model provider", paragraphs: ["Used as the primary Erma generation route when configured and available. Provider requests contain only context required for the selected AI feature."] },
    { title: "ElevenLabs", paragraphs: ["Optionally used for text-to-speech when the user explicitly requests server TTS. Browser speech remains a separate fallback path."] },
    { title: "External API", paragraphs: ["May be enabled for authorized accounts. Its route must be explicitly identified and must not be disguised as Erma/NVIDIA."] },
  ] },
  security: { ...ru.security, title: "Security Disclosure", label: "Security", intro: "Technical boundaries, vulnerability reporting, and responsible research.", sections: [
    { title: "Boundaries", paragraphs: ["TK LAB uses server-only secrets, authentication, same-origin validation, bounded bodies, rate limits, provider timeouts, CSP, safe rendering, and bounded tool capabilities. No single control is treated as absolute security."] },
    { title: "Reporting", paragraphs: ["Report suspected vulnerabilities privately through GitHub Security Advisory or the published security contact. Do not publish real keys, OAuth credentials, private user data, or production prompt content."] },
    { title: "Safe harbor", paragraphs: ["Good-faith research should minimize data access, preserve service availability, and stop after demonstrating the issue. Mass scanning, persistence, social engineering, and destructive testing are outside this permission without separate authorization."] },
  ] },
};

export function getLegalDocument(locale: Locale, slug: LegalDocumentSlug) {
  return (locale === "ru" ? ru : en)[slug];
}

export function isLegalDocumentSlug(value: string): value is LegalDocumentSlug {
  return value === "privacy" || value === "acceptable-use" || value === "ai-transparency" || value === "subprocessors" || value === "security";
}
