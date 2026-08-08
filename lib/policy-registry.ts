import type { Locale } from "@/lib/i18n";

export const AI_POLICY_VERSION = "2026-08-08.v2";
export type PolicyCategory = "allowed" | "restricted" | "high-impact" | "harmful" | "prompt-injection" | "secret-extraction";
export type PolicyAction = "allow" | "caution" | "refuse";

export type PolicyRule = {
  code: string;
  category: PolicyCategory;
  action: PolicyAction;
  publicTitle: { ru: string; en: string };
  publicSummary: { ru: string; en: string };
  patterns?: readonly RegExp[];
};

export const POLICY_RULES: readonly PolicyRule[] = [
  { code: "allowed.general", category: "allowed", action: "allow", publicTitle: { ru: "Обычные задачи", en: "General work" }, publicSummary: { ru: "Законные исследовательские, образовательные, творческие, инженерные и рабочие задачи разрешены с обычной проверкой результата.", en: "Lawful research, education, creative, engineering, and professional work is allowed with normal output verification." } },
  { code: "restricted.sensitive-data", category: "restricted", action: "caution", publicTitle: { ru: "Чувствительные данные", en: "Sensitive data" }, publicSummary: { ru: "Не передавайте пароли, ключи, платёжные данные, чужие секреты или специальные категории персональных данных без законного основания и реальной необходимости.", en: "Do not provide passwords, keys, payment data, third-party secrets, or special-category personal data without a lawful basis and real necessity." }, patterns: [/\b(?:password|api key|secret key|credit card|cvv)\b/i, /(?:парол|api[- ]?ключ|секретн.{0,12}ключ|номер карты|cvv)/iu] },
  { code: "high-impact.human-oversight", category: "high-impact", action: "caution", publicTitle: { ru: "Высокозначимые решения", en: "High-impact decisions" }, publicSummary: { ru: "AI не должен быть единственным основанием для решений о здоровье, финансах, трудовых правах, образовании, доступе к услугам или иных фундаментальных правах. Нужен квалифицированный человеческий контроль.", en: "AI must not be the sole basis for decisions about health, finance, employment, education, essential services, or fundamental rights. Qualified human oversight is required." }, patterns: [/\b(?:hire|fire|loan approval|credit score|medical diagnosis|deny benefits|admissions decision)\b/i, /(?:увол|нанять|одобрить кредит|кредитн.{0,10}скор|диагноз|отказать в пособ|решение о поступлении)/iu] },
  { code: "harmful.cyber-abuse", category: "harmful", action: "refuse", publicTitle: { ru: "Вред и злоупотребление", en: "Harm and abuse" }, publicSummary: { ru: "Запрещены вредоносное ПО, кража учётных данных, фишинг, destructive payloads, несанкционированный доступ, обход защиты и иные действия, создающие прямой вред.", en: "Malware, credential theft, phishing, destructive payloads, unauthorized access, security bypass, and other directly harmful activity are prohibited." }, patterns: [/\b(?:malware|ransomware|keylogger|credential theft|steal passwords?|exfiltrat(?:e|ion)|botnet|backdoor|rootkit|phishing kit)\b/i, /\b(?:bypass|evade|disable|defeat)\b.{0,100}\b(?:authentication|antivirus|edr|security|rate limit|access control)\b/i, /\b(?:exploit|payload)\b.{0,100}\b(?:remote code execution|privilege escalation|victim|target)\b/i, /(?:напиши|сгенерируй|создай|реализуй|разработай|покажи|дай|сделай).{0,100}(?:вредоносн|шифровальщик|кейлоггер|украд|парол|обход.{0,20}аутентификац|фишинг|бекдор|ботнет|эксфильтрац)/iu] },
  { code: "prompt-injection.override", category: "prompt-injection", action: "refuse", publicTitle: { ru: "Подмена инструкций", en: "Instruction override" }, publicSummary: { ru: "Попытки заменить системные правила, отключить safeguards или заставить недоверенный файл/tool result действовать как системная инструкция не выполняются.", en: "Attempts to replace system rules, disable safeguards, or make untrusted file/tool content act as system instructions are not followed." }, patterns: [/\b(?:ignore|disregard|forget|override|bypass|disable|remove)\b.{0,100}\b(?:previous|system|developer|safety|security|instructions?|rules?|policy|guardrails?)\b/i, /\b(?:jailbreak|dan mode|do anything now|uncensored|without restrictions?)\b/i, /<\|(?:system|developer|assistant)\|>|\[(?:system|developer|instruction)\]|###\s*(?:system|instruction)/i, /(?:игнорируй|забудь|отмени|обойди|отключи|замени|нарушь).{0,100}(?:предыдущие|системные|служебные|инструкции|правила|ограничения|защиту|политик)/iu, /(?:джейлбрейк|дан[- ]?режим|без ограничений|делай что угодно)/iu] },
  { code: "secret-extraction.internal", category: "secret-extraction", action: "refuse", publicTitle: { ru: "Системные секреты", en: "System secrets" }, publicSummary: { ru: "Нельзя извлекать system prompts, hidden reasoning, provider credentials, внутренние журналы или данные другого пользователя.", en: "System prompts, hidden reasoning, provider credentials, internal logs, and another user's data must not be extracted." }, patterns: [/\b(?:reveal|print|show|repeat|quote|summarize|translate|decode)\b.{0,100}\b(?:system prompt|developer message|hidden prompt|internal instructions?|secrets?|credentials?)\b/i, /\b(?:system prompt|developer message|hidden prompt|internal instructions?)\b/i, /(?:системн(?:ый|ые|ую)|служебн(?:ый|ые|ую)|скрыт(?:ый|ые|ую)).{0,100}(?:промпт|инструкц|сообщен|правил|секрет|ключ|рассуждени)/iu, /(?:раскрой промпт|покажи инструкции|внутренн(?:ие|ю) рассуждения)/iu] },
] as const;

export function getPublicPolicySections(locale: Locale) {
  return POLICY_RULES.map((rule) => ({ code: rule.code, category: rule.category, action: rule.action, title: rule.publicTitle[locale], paragraphs: [rule.publicSummary[locale]] as const }));
}

export function getAcceptableUseDocument(locale: Locale) {
  return { slug: "acceptable-use" as const, version: AI_POLICY_VERSION, label: locale === "ru" ? "Правила использования" : "Usage Policy", title: "Acceptable Use Policy", intro: locale === "ru" ? "Публичные правила и runtime policy используют одну версионируемую taxonomy." : "Public rules and runtime policy use one versioned taxonomy.", sections: getPublicPolicySections(locale) };
}
