import type { AiToolName } from "@/lib/ai/types";

export type DirectToolRecipe = {
  name: AiToolName;
  args: Record<string, unknown>;
};

export function extractReleaseVersions(prompt: string) {
  const versions = prompt.match(/\bv?\d+\.\d+\.\d+\b/gi) ?? [];
  return [...new Set(versions.map((value) => value.toLowerCase().startsWith("v") ? value.toLowerCase() : `v${value.toLowerCase()}`))].slice(0, 5);
}

export function shouldIncludeLocalArchive(prompt: string) {
  return /(?:локальн\w*\s+(?:архив|истори)|мо[ийх]+\s+(?:диалог|чат|разговор)|в\s+(?:моей|моём)\s+истори|local\s+(?:archive|history)|my\s+(?:conversation|chat)\s+history|find\s+(?:a\s+)?conversation)/i.test(prompt);
}

function arithmeticExpression(prompt: string) {
  const normalized = prompt.trim().replace(/^(?:посчитай|вычисли|calculate|compute)\s*[:：]?\s*/i, "");
  if (!normalized || normalized.length > 120) return "";
  if (!/^[0-9eE+\-*/%^().\s]+$/.test(normalized)) return "";
  return /\d/.test(normalized) ? normalized : "";
}

export function detectDirectToolRecipe(prompt: string): DirectToolRecipe | null {
  const expression = arithmeticExpression(prompt);
  if (expression) return { name: "calculate", args: { expression } };

  const versions = extractReleaseVersions(prompt);
  if (versions.length && /(?:что\s+(?:измен|нов)|сравн|разниц|между|release|patch|version|changelog|changed|difference|compare)/i.test(prompt)) {
    return { name: "search_patch_notes", args: { versions, limit: Math.min(5, Math.max(versions.length, 2)) } };
  }

  if (/^(?:проверь\s+)?(?:статус|status|health)(?:\s+(?:сервис|service|сайта|site|системы|system))?[?.!\s]*$/i.test(prompt.trim())
    || /(?:работают\s+ли\s+сервисы|сервис\w*\s+работает|service\s+status|is\s+the\s+service\s+up)/i.test(prompt)) {
    return { name: "get_service_status", args: {} };
  }

  if (/(?:что\s+умеет|возможност\w*\s+модел|model\s+capabilit|supports?\s+tools?|tool\s+calling)/i.test(prompt)) {
    const model = prompt.match(/erma(?:\s*[·-]?\s*(?:auto|lite|core|pro))?/i)?.[0] ?? "";
    return { name: "get_model_capabilities", args: model ? { model } : {} };
  }

  if (shouldIncludeLocalArchive(prompt)) {
    return { name: "search_local_archive", args: { query: prompt.slice(0, 160), limit: 5 } };
  }

  if (/(?:документац|инструкц|справк|documentation|docs?|guide)/i.test(prompt)) {
    return { name: "search_documentation", args: { query: prompt.slice(0, 160), limit: 4 } };
  }

  return null;
}

export function shouldOfferPlanner(prompt: string) {
  if (detectDirectToolRecipe(prompt)) return false;
  return /(?:release|patch|version|changelog|релиз|верси|обновлен|documentation|docs?|документац|инструкц|справк|service\s*status|health|статус|доступност|archive|history|conversation|архив|истори|диалог|model capabilit|tool calling|tools?|возможност.*модел|инструмент)/i.test(prompt);
}
