import {
  PERSONAL_MEMORY_STORAGE_KEY,
  emptyPersonalMemoryStore,
  parsePersonalMemoryStore,
  type PersonalMemoryCategory,
  type PersonalMemoryEntry,
  type PersonalMemoryStore,
} from "@/lib/ai/personal-memory";

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `memory-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readPersonalMemory(): PersonalMemoryStore {
  if (typeof window === "undefined") return emptyPersonalMemoryStore();
  try {
    const raw = window.localStorage.getItem(PERSONAL_MEMORY_STORAGE_KEY);
    return raw ? parsePersonalMemoryStore(JSON.parse(raw)) : emptyPersonalMemoryStore();
  } catch {
    return emptyPersonalMemoryStore();
  }
}

export function writePersonalMemory(store: PersonalMemoryStore) {
  if (typeof window === "undefined") return;
  const normalized = parsePersonalMemoryStore(store);
  try {
    window.localStorage.setItem(PERSONAL_MEMORY_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("tklabs:personal-memory", { detail: normalized }));
  } catch {
    // Local memory is optional. Storage denial must not break chat.
  }
}

export function addPersonalMemory(category: PersonalMemoryCategory, label: string, value: string) {
  const store = readPersonalMemory();
  const now = Date.now();
  const entry: PersonalMemoryEntry = {
    id: newId(),
    category,
    label,
    value,
    createdAt: now,
    updatedAt: now,
    source: "user-confirmed",
  };
  const next = parsePersonalMemoryStore({ ...store, entries: [entry, ...store.entries] });
  writePersonalMemory(next);
  return next;
}

export function updatePersonalMemory(id: string, patch: Pick<PersonalMemoryEntry, "category" | "label" | "value">) {
  const store = readPersonalMemory();
  const next = parsePersonalMemoryStore({
    ...store,
    entries: store.entries.map((entry) => entry.id === id ? { ...entry, ...patch, updatedAt: Date.now(), source: "user-confirmed" } : entry),
  });
  writePersonalMemory(next);
  return next;
}

export function deletePersonalMemory(id: string) {
  const store = readPersonalMemory();
  const next = { ...store, entries: store.entries.filter((entry) => entry.id !== id) };
  writePersonalMemory(next);
  return next;
}

export function clearPersonalMemory() {
  const next = emptyPersonalMemoryStore();
  writePersonalMemory(next);
  return next;
}

export function personalMemoryPacket() {
  return readPersonalMemory().entries.slice(0, 24);
}
