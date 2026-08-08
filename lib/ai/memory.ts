export type MemoryRole = "user" | "assistant";

export type MemoryMessage = {
  role: MemoryRole;
  content: string;
};

export type StructuredChatMemory = {
  goals: string[];
  decisions: string[];
  constraints: string[];
  facts: string[];
  openTasks: string[];
};

const MAX_ITEM_CHARACTERS = 520;
const MAX_STRUCTURED_ITEMS_PER_SECTION = 6;
const MAX_FACT_ITEMS = 12;
const MAX_MEMORY_CHARACTERS = 8_000;

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(value: string) {
  const normalized = compact(value);
  const chars = Array.from(normalized);
  return chars.length <= MAX_ITEM_CHARACTERS ? normalized : `${chars.slice(0, MAX_ITEM_CHARACTERS - 1).join("")}…`;
}

function key(value: string) {
  return compact(value).toLocaleLowerCase();
}

function pushUnique(target: string[], value: string, maxItems = MAX_STRUCTURED_ITEMS_PER_SECTION) {
  const clean = excerpt(value);
  if (!clean || target.some((item) => key(item) === key(clean))) return;
  target.push(clean);
  if (target.length > maxItems) target.shift();
}

function looksLikeConstraint(text: string) {
  return /\b(?:must|need to|only|without|never|cannot|can't|required|limit|constraint)\b|(?:долж|нужно|только|без |нельзя|никогда|обяз|лимит|огранич)/iu.test(text);
}

function looksLikeDecision(text: string) {
  return /\b(?:decided|decision|we will|we'll|chosen|selected|agreed|use instead|final choice)\b|(?:решил|решили|решение|выбрали|будем|согласовал|итогов|вместо)/iu.test(text);
}

function looksLikeOpenTask(text: string) {
  return /\b(?:todo|next|remaining|still need|follow[- ]?up|later|pending|should add|need to add)\b|(?:дальше|следующ|осталось|потом|позже|нужно добавить|предстоит|не заверш)/iu.test(text);
}

function looksLikeGoal(text: string) {
  return /\b(?:goal|objective|want to|we need|build|implement|create|make|improve|fix)\b|(?:цель|хочу|хотим|нужно сделать|реализ|созда|улучш|исправ|доработ)/iu.test(text);
}

export function buildStructuredChatMemory(messages: MemoryMessage[]): StructuredChatMemory {
  const memory: StructuredChatMemory = { goals: [], decisions: [], constraints: [], facts: [], openTasks: [] };

  for (const message of messages) {
    const text = excerpt(message.content);
    if (!text) continue;

    if (looksLikeConstraint(text)) pushUnique(memory.constraints, text);
    if (looksLikeDecision(text)) pushUnique(memory.decisions, text);
    if (looksLikeOpenTask(text)) pushUnique(memory.openTasks, text);
    if (message.role === "user" && looksLikeGoal(text)) pushUnique(memory.goals, text);

    if (
      !looksLikeConstraint(text)
      && !looksLikeDecision(text)
      && !looksLikeOpenTask(text)
      && !(message.role === "user" && looksLikeGoal(text))
    ) {
      pushUnique(memory.facts, `${message.role === "user" ? "User" : "Assistant"}: ${text}`, MAX_FACT_ITEMS);
    }
  }

  return memory;
}

const SECTION_ORDER: Array<[keyof StructuredChatMemory, string]> = [
  ["goals", "Goals"],
  ["decisions", "Decisions"],
  ["constraints", "Constraints"],
  ["facts", "Relevant facts"],
  ["openTasks", "Open tasks"],
];

export function renderStructuredChatMemory(memory: StructuredChatMemory) {
  const sections = SECTION_ORDER.flatMap(([keyName, title]) => {
    const items = memory[keyName];
    if (!items.length) return [];
    return [`${title}:`, ...items.map((item) => `- ${item}`)];
  });
  const rendered = sections.join("\n");
  if (Array.from(rendered).length <= MAX_MEMORY_CHARACTERS) return rendered;
  return Array.from(rendered).slice(-MAX_MEMORY_CHARACTERS).join("");
}

export function buildStructuredMemorySummary(messages: MemoryMessage[]) {
  return renderStructuredChatMemory(buildStructuredChatMemory(messages));
}
