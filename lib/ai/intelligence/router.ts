import { shouldGroundExactFact } from "@/lib/ai/intelligence/grounding";

export type ErmaTaskIntent =
  | "conversation"
  | "analysis"
  | "math"
  | "research"
  | "fresh_information"
  | "fact_lookup"
  | "tklab_policy"
  | "tklab_release"
  | "document"
  | "code"
  | "planning"
  | "comparison";

export type ErmaFreshness = "none" | "internal-current" | "web-current";
export type ErmaVerification = "normal" | "verify-tools" | "verify-sources" | "verify-calculation";
export type ErmaToolClass = "none" | "internal" | "web" | "math" | "document" | "code";
export type ErmaIntelligenceRoute = { schemaVersion: 1; intent: ErmaTaskIntent; freshness: ErmaFreshness; verification: ErmaVerification; toolClass: ErmaToolClass; shouldPlanTools: boolean; shouldCiteSources: boolean; maxToolCalls: number; maxToolRounds: number; reasonCode: string };

const CURRENT_WORDS = /(?:сегодня|сейчас|текущ[\p{L}\p{M}]*|последн[\p{L}\p{M}]*|свеж[\p{L}\p{M}]*|недавн[\p{L}\p{M}]*|новост[\p{L}\p{M}]*|на данный момент|қазір|қазіргі|бүгін|today|current(?:ly)?|latest|recent|news|right now|this week|this month)/iu;
const WEB_FACT_WORDS = /(?:интернет|веб|web|online|источник|source|новост|рынок|цена|стоимост|курс|погод|результат матч|выбор|президент|премьер|компан[\p{L}\p{M}]* сейчас|latest|today|current|news|market|price|weather|election|president|prime minister)/iu;
const TKLAB_WORDS = /(?:tk\s*lab|tklab|tk labs|erma)/i;
const POLICY_WORDS = /(?:terms|agreement|privacy|политик|соглашен|конфиденц|acceptable use|aup|security|безопасност|retention|хранен|удален|provider|провайдер|данн[\p{L}\p{M}]*)/iu;
const RELEASE_WORDS = /(?:patch|release|version|changelog|update|патч|релиз|верси|обновлен|что нового|изменил)/i;
const DOCUMENT_WORDS = /(?:pdf|документ|файл|вложен|прикреп[\p{L}\p{M}]*|attachment|document|contract|договор|таблиц|csv|отч[её]т|report)/iu;
const DOCUMENT_CONTENT_REFERENCE = /(?:\b(?:в|из|по)\s+(?:этом\s+|этих\s+)?(?:документ|файл|pdf|отч[её]т)|прикреп[\p{L}\p{M}]*|вложен[\p{L}\p{M}]*|attached\s+(?:document|file)|this\s+(?:document|file)|the\s+(?:document|file)|(?:document|file)\s+(?:says|contains|shows))/iu;
const CODE_WORDS = /(?:код|code|typescript|javascript|python|react|next\.js|sql|api|bug|ошибк|репозитор|repository|function|class|compile|lint|test)/i;
const PLAN_WORDS = /(?:план|поэтап|пошаг|roadmap|plan|steps?|strategy|стратег)/i;
const COMPARE_WORDS = /(?:сравн|разниц|отлич|compare|versus|\bvs\b|difference|между)/i;
const RESEARCH_WORDS = /(?:исслед|проанализируй рынок|обзор источников|deep research|research|survey|landscape|competitive analysis)/i;
const ANALYSIS_WORDS = /(?:проанализ|объясни почему|разбери|оцени|докажи|reason|analy[sz]e|explain why|evaluate|derive)/i;
const MATH_WORDS = /(?:посчитай|вычисли|уравнен|интеграл|производн|матриц|вероятност|формул|latex|математ|solve|calculate|compute|equation|integral|derivative|matrix|probability|\b[xyz]\s*[=+\-*\/^]|\d\s*[+\-*\/^]\s*\d)/i;

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

function routeFor(intent: ErmaTaskIntent, prompt: string): ErmaIntelligenceRoute {
  const current = CURRENT_WORDS.test(prompt); const comparison = COMPARE_WORDS.test(prompt);
  if (intent === "tklab_policy") return { schemaVersion: 1, intent, freshness: "internal-current", verification: "verify-sources", toolClass: "internal", shouldPlanTools: true, shouldCiteSources: true, maxToolCalls: comparison ? 4 : 2, maxToolRounds: 2, reasonCode: "TKLAB_POLICY_SOURCE_OF_TRUTH" };
  if (intent === "tklab_release") return { schemaVersion: 1, intent, freshness: "internal-current", verification: "verify-sources", toolClass: "internal", shouldPlanTools: true, shouldCiteSources: true, maxToolCalls: comparison ? 5 : 2, maxToolRounds: 2, reasonCode: "TKLAB_RELEASE_SOURCE_OF_TRUTH" };
  if (intent === "math") return { schemaVersion: 1, intent, freshness: "none", verification: "verify-calculation", toolClass: "math", shouldPlanTools: true, shouldCiteSources: false, maxToolCalls: 4, maxToolRounds: 2, reasonCode: "DETERMINISTIC_MATH_PREFERRED" };
  if (intent === "fresh_information" || intent === "research") return { schemaVersion: 1, intent, freshness: "web-current", verification: "verify-sources", toolClass: "web", shouldPlanTools: true, shouldCiteSources: true, maxToolCalls: intent === "research" ? 8 : 5, maxToolRounds: intent === "research" ? 3 : 2, reasonCode: intent === "research" ? "MULTI_SOURCE_RESEARCH" : "CURRENT_EXTERNAL_FACTS_REQUIRED" };
  if (intent === "fact_lookup") return { schemaVersion: 1, intent, freshness: current ? "web-current" : "none", verification: "verify-sources", toolClass: "web", shouldPlanTools: true, shouldCiteSources: true, maxToolCalls: 6, maxToolRounds: 2, reasonCode: current ? "CURRENT_GROUNDED_FACT_LOOKUP" : "GROUNDED_FACT_LOOKUP" };
  if (intent === "document") return { schemaVersion: 1, intent, freshness: "none", verification: "verify-sources", toolClass: "document", shouldPlanTools: true, shouldCiteSources: true, maxToolCalls: comparison ? 6 : 4, maxToolRounds: 2, reasonCode: "DOCUMENT_EVIDENCE_REQUIRED" };
  if (intent === "code") return { schemaVersion: 1, intent, freshness: current ? "web-current" : "none", verification: "verify-tools", toolClass: current ? "web" : "code", shouldPlanTools: true, shouldCiteSources: current, maxToolCalls: current ? 5 : 2, maxToolRounds: current ? 2 : 1, reasonCode: current ? "CURRENT_TECHNICAL_FACTS_REQUIRED" : "ISOLATED_CODE_VERIFICATION_PREFERRED" };
  if (intent === "comparison") return { schemaVersion: 1, intent, freshness: current ? "web-current" : "none", verification: current ? "verify-sources" : "normal", toolClass: current ? "web" : "none", shouldPlanTools: current, shouldCiteSources: current, maxToolCalls: current ? 6 : 0, maxToolRounds: current ? 2 : 0, reasonCode: current ? "CURRENT_COMPARISON" : "STATIC_COMPARISON" };
  return { schemaVersion: 1, intent, freshness: "none", verification: intent === "analysis" || intent === "planning" ? "verify-tools" : "normal", toolClass: "none", shouldPlanTools: false, shouldCiteSources: false, maxToolCalls: 0, maxToolRounds: 0, reasonCode: intent === "conversation" ? "DIRECT_CONVERSATION" : "MODEL_REASONING" };
}

export function routeErmaTask(prompt: string): ErmaIntelligenceRoute {
  const normalized = prompt.trim().slice(0, 12_000);
  if (!normalized) return routeFor("conversation", normalized);
  if (TKLAB_WORDS.test(normalized) && POLICY_WORDS.test(normalized)) return routeFor("tklab_policy", normalized);
  if (TKLAB_WORDS.test(normalized) && RELEASE_WORDS.test(normalized)) return routeFor("tklab_release", normalized);
  if (RESEARCH_WORDS.test(normalized)) return routeFor("research", normalized);
  const groundedExactFact = shouldGroundExactFact(normalized);
  if (DOCUMENT_WORDS.test(normalized) && (DOCUMENT_CONTENT_REFERENCE.test(normalized) || !groundedExactFact)) return routeFor("document", normalized);
  if (MATH_WORDS.test(normalized)) return routeFor("math", normalized);
  if (CURRENT_WORDS.test(normalized) && (WEB_FACT_WORDS.test(normalized) || ANALYSIS_WORDS.test(normalized))) return routeFor("fresh_information", normalized);
  if (groundedExactFact) return routeFor("fact_lookup", normalized);
  if (CODE_WORDS.test(normalized)) return routeFor("code", normalized);
  if (PLAN_WORDS.test(normalized)) return routeFor("planning", normalized);
  if (COMPARE_WORDS.test(normalized)) return routeFor("comparison", normalized);
  if (ANALYSIS_WORDS.test(normalized)) return routeFor("analysis", normalized);
  return routeFor("conversation", normalized);
}

export function boundRouteToToolCapability(route: ErmaIntelligenceRoute, capabilityMaxCalls: number, capabilityMaxRounds: number) { return { ...route, maxToolCalls: clamp(route.maxToolCalls, 0, Math.max(0, capabilityMaxCalls)), maxToolRounds: clamp(route.maxToolRounds, 0, Math.max(0, capabilityMaxRounds)) }; }
