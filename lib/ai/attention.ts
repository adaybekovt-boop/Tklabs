export type AttentionMessage = { role: "user" | "assistant" | "system"; content: string };
export type AttentionInsightKind = "repeated-topic" | "open-loop" | "decision-drift";
export type AttentionInsight = {
  id: string;
  kind: AttentionInsightKind;
  title: string;
  detail: string;
  confidence: number;
  evidenceIndexes: number[];
};

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}_-]*/gu;
const STOP = new Set([
  "это", "как", "что", "чтобы", "или", "там", "так", "вот", "для", "она", "они", "его", "еще", "ещё", "надо", "можно", "будет", "было", "тоже", "уже", "мне", "наш", "наша", "the", "and", "with", "that", "this", "from", "have", "will", "would", "about", "into", "your", "you", "are", "was", "were", "can", "could",
]);
const OPEN_LOOP_RE = /\b(потом|позже|следующ(?:ий|ая|ее)|не забуд|верн(?:ем|ём)ся|надо будет|todo|later|next|remember to|come back)\b/iu;
const DECISION_RE = /\b(решил|решили|выбираю|выбрали|делаем|оставляем|отменяю|меняем|решение|decided|choose|chosen|we will|cancel|switch)\b/iu;

function tokens(value: string) {
  return (value.toLowerCase().match(WORD_RE) ?? []).filter((token) => token.length >= 4 && !STOP.has(token));
}

function signature(value: string) {
  return [...new Set(tokens(value))].slice(0, 24);
}

function overlap(a: readonly string[], b: readonly string[]) {
  if (!a.length || !b.length) return 0;
  const right = new Set(b);
  let shared = 0;
  for (const token of a) if (right.has(token)) shared += 1;
  return shared / Math.max(2, Math.min(a.length, b.length));
}

function short(value: string, max = 110) {
  const clean = value.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

export function detectAttentionInsight(messages: readonly AttentionMessage[]): AttentionInsight | null {
  const user = messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.role === "user" && message.content.trim().length >= 12)
    .slice(-14);
  if (user.length < 2) return null;

  const latest = user[user.length - 1];
  const latestTokens = signature(latest.message.content);
  let bestRepeat: { score: number; index: number } | null = null;
  for (const prior of user.slice(0, -1)) {
    const score = overlap(latestTokens, signature(prior.message.content));
    if (score >= 0.44 && (!bestRepeat || score > bestRepeat.score)) bestRepeat = { score, index: prior.index };
  }
  if (bestRepeat) {
    const confidence = Math.min(0.96, 0.78 + bestRepeat.score * 0.22);
    if (confidence >= 0.86) {
      return {
        id: `repeat-${bestRepeat.index}-${latest.index}`,
        kind: "repeated-topic",
        title: "Повторяющаяся тема",
        detail: `Этот вопрос уже появлялся в диалоге. Возможно, вместо ещё одного круга стоит зафиксировать решение или следующий шаг: “${short(latest.message.content)}”`,
        confidence,
        evidenceIndexes: [bestRepeat.index, latest.index],
      };
    }
  }

  const unresolved = user.slice(0, -1).reverse().find(({ message }) => OPEN_LOOP_RE.test(message.content));
  if (unresolved && latest.index - unresolved.index >= 2) {
    return {
      id: `open-${unresolved.index}-${latest.index}`,
      kind: "open-loop",
      title: "Незакрытый пункт",
      detail: `Ранее остался пункт, к которому планировалось вернуться: “${short(unresolved.message.content)}”`,
      confidence: 0.88,
      evidenceIndexes: [unresolved.index],
    };
  }

  const decisions = user.filter(({ message }) => DECISION_RE.test(message.content));
  if (decisions.length >= 2) {
    const previous = decisions[decisions.length - 2];
    const current = decisions[decisions.length - 1];
    if (current.index !== previous.index && overlap(signature(previous.message.content), signature(current.message.content)) >= 0.25) {
      return {
        id: `decision-${previous.index}-${current.index}`,
        kind: "decision-drift",
        title: "Решение могло измениться",
        detail: `В диалоге есть два похожих решения. Стоит явно сохранить актуальный вариант и отменить старый, если он больше не действует.`,
        confidence: 0.87,
        evidenceIndexes: [previous.index, current.index],
      };
    }
  }

  return null;
}
