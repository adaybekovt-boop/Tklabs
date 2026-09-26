/** Server-only provider payload. Never import this module from client code. */
export type AiTextPair = {
  answer: string;
  thinking?: string;
};

const INLINE_REASONING_BLOCK = /<(think|thinking|analysis|reasoning|thought)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
const MIN_DUPLICATE_REASONING_LENGTH = 80;
export const MAX_PROVIDER_TEXT_LENGTH = 64_000;

const REASONING_TAG_NAMES = ["think", "thinking", "analysis", "reasoning", "thought"];
const REASONING_TAG_START = /^<(think|thinking|analysis|reasoning|thought)\b[^>]*>/i;
const INCOMPLETE_REASONING_TAG = /^<(think|thinking|analysis|reasoning|thought)\b[^>]*$/i;

/** Strip inline provider reasoning before any text crosses the SSE boundary. */
export class StreamingReasoningFilter {
  private pending = "";
  private hiddenTag: string | null = null;
  private separator = false;
  private visible = false;
  reasoningUsed = false;

  push(text: string) {
    this.pending += text;
    let output = "";
    const emit = (part: string) => {
      if (!part) return;
      if (this.separator && this.visible) output += "\n";
      this.separator = false;
      this.visible = true;
      output += part;
    };

    while (this.pending) {
      if (this.hiddenTag) {
        const close = new RegExp(`</${this.hiddenTag}\\s*>`, "i").exec(this.pending);
        if (!close) {
          // Keep a possible split closing tag, discard the hidden body itself.
          const lastOpen = this.pending.lastIndexOf("<");
          this.pending = lastOpen >= 0 ? this.pending.slice(lastOpen) : "";
          break;
        }
        this.pending = this.pending.slice(close.index + close[0].length);
        this.hiddenTag = null;
        this.separator = true;
        continue;
      }

      const open = this.pending.indexOf("<");
      if (open < 0) { emit(this.pending); this.pending = ""; break; }
      emit(this.pending.slice(0, open));
      this.pending = this.pending.slice(open);
      const tag = REASONING_TAG_START.exec(this.pending);
      if (tag) {
        this.hiddenTag = tag[1].toLowerCase();
        this.reasoningUsed = true;
        this.pending = this.pending.slice(tag[0].length);
        continue;
      }
      if (REASONING_TAG_NAMES.some((name) => `<${name}`.startsWith(this.pending.toLowerCase())) || INCOMPLETE_REASONING_TAG.test(this.pending)) break;
      emit("<");
      this.pending = this.pending.slice(1);
    }
    return output;
  }

  finish() {
    const output = this.hiddenTag || INCOMPLETE_REASONING_TAG.test(this.pending) ? "" : this.pending;
    this.pending = "";
    return output;
  }
}

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
