/** Server-only provider payload. Never import this module from client code. */
export type AiTextPair = {
  answer: string;
  thinking?: string;
};

const INLINE_REASONING_BLOCK = /<(think|thinking|analysis|reasoning|thought)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
const MIN_DUPLICATE_REASONING_LENGTH = 80;
export const MAX_PROVIDER_TEXT_LENGTH = 64_000;

function comparisonText(value: string) {
  return value.replace(/\s+/gu, " ").trim().toLocaleLowerCase();
}

function boundProviderText(value: string) {
  return value.slice(0, MAX_PROVIDER_TEXT_LENGTH).trim();
}

function mergeThinking(parts: Array<string | undefined>) {
  const unique: string[] = [];

  for (const part of parts) {
    const trimmed = part?.trim();
    if (!trimmed) continue;

    const normalized = comparisonText(trimmed);
    if (unique.some((existing) => comparisonText(existing) === normalized)) continue;
    unique.push(trimmed);
  }

  return unique.join("\n\n").trim();
}

function stripDuplicatePrefix(answer: string, thinking: string) {
  const answerTokens = answer.trim().split(/\s+/u);
  const thinkingTokens = thinking.trim().split(/\s+/u);
  if (answerTokens.length < thinkingTokens.length) return answer;

  const matches = thinkingTokens.every((token, index) => token.toLocaleLowerCase() === answerTokens[index]?.toLocaleLowerCase());
  if (!matches) return answer;

  return answerTokens
    .slice(thinkingTokens.length)
    .join(" ")
    .replace(/^[\s:;,.!?-]+/u, "")
    .trim();
}

/**
 * Normalizes provider text before server-side safety evaluation. The returned
 * thinking field is transient server data and must never cross an API or UI
 * boundary.
 */
export function normalizeAiTextPair({ answer, thinking }: AiTextPair): AiTextPair {
  const extractedThinking: string[] = [];
  let normalizedAnswer = boundProviderText(answer).replace(INLINE_REASONING_BLOCK, (_match, _tag, block: string) => {
    if (block.trim()) extractedThinking.push(block.trim());
    return "\n";
  }).trim();
  const normalizedThinking = mergeThinking([boundProviderText(thinking ?? ""), ...extractedThinking]);

  const answerForComparison = comparisonText(normalizedAnswer);
  const thinkingForComparison = comparisonText(normalizedThinking);

  if (thinkingForComparison.length >= MIN_DUPLICATE_REASONING_LENGTH) {
    if (answerForComparison === thinkingForComparison) {
      normalizedAnswer = "";
    } else if (answerForComparison.startsWith(thinkingForComparison)) {
      normalizedAnswer = stripDuplicatePrefix(normalizedAnswer, normalizedThinking);
    }
  }

  return {
    answer: normalizedAnswer,
    ...(normalizedThinking ? { thinking: normalizedThinking } : {}),
  };
}
