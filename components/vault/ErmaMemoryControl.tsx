"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  PERSONAL_MEMORY_CATEGORIES,
  type PersonalMemoryCategory,
  type PersonalMemoryEntry,
  type PersonalMemoryStore,
} from "@/lib/ai/personal-memory";
import {
  addPersonalMemory,
  clearPersonalMemory,
  deletePersonalMemory,
  readPersonalMemory,
  updatePersonalMemory,
} from "@/lib/ai/personal-memory-client";
import type { Locale } from "@/lib/i18n";

const CATEGORY_LABELS: Record<PersonalMemoryCategory, { ru: string; en: string }> = {
  person: { ru: "Человек", en: "Person" },
  project: { ru: "Проект", en: "Project" },
  preference: { ru: "Предпочтение", en: "Preference" },
  goal: { ru: "Цель", en: "Goal" },
  decision: { ru: "Решение", en: "Decision" },
  constraint: { ru: "Ограничение", en: "Constraint" },
  important_date: { ru: "Важная дата", en: "Important date" },
};

export function ErmaMemoryControl({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [store, setStore] = useState<PersonalMemoryStore | null>(null);
  const [category, setCategory] = useState<PersonalMemoryCategory>("project");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<PersonalMemoryEntry | null>(null);

  useEffect(() => {
    setStore(readPersonalMemory());
    const listener = () => setStore(readPersonalMemory());
    window.addEventListener("tklabs:personal-memory", listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("tklabs:personal-memory", listener);
      window.removeEventListener("storage", listener);
    };
  }, []);

  const entries = useMemo(() => store?.entries ?? [], [store]);

  function resetForm() {
    setEditing(null);
    setCategory("project");
    setLabel("");
    setValue("");
  }

  function submit() {
    const cleanLabel = label.trim();
    const cleanValue = value.trim();
    if (!cleanLabel || !cleanValue) return;
    const next = editing
      ? updatePersonalMemory(editing.id, { category, label: cleanLabel, value: cleanValue })
      : addPersonalMemory(category, cleanLabel, cleanValue);
    setStore(next);
    resetForm();
  }

  function beginEdit(entry: PersonalMemoryEntry) {
    setEditing(entry);
    setCategory(entry.category);
    setLabel(entry.label);
    setValue(entry.value);
  }

  return (
    <section className="mt-8 border border-outline-variant/40 bg-surface-container-low p-5 sm:p-6" aria-labelledby="erma-memory-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2"><Brain size={18} className="text-secondary" /><p className="label-caps text-secondary">ERMA MEMORY</p></div>
          <h2 id="erma-memory-title" className="mt-3 text-xl font-semibold text-primary">{ru ? "Память, которой управляете вы" : "Memory you control"}</h2>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{ru ? "Erma использует только записи, которые вы явно сохранили здесь. Они остаются в localStorage и прикладываются к AI-запросу только ограниченным релевантным контекстом. Можно изменить или забыть любую запись." : "Erma only uses entries you explicitly save here. They stay in localStorage and are attached to AI requests only as bounded relevant context. Every entry can be edited or forgotten."}</p>
        </div>
        {entries.length ? <button type="button" onClick={() => { setStore(clearPersonalMemory()); resetForm(); }} className="min-h-10 shrink-0 border border-outline-variant/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-surface-container">{ru ? "Забыть всё" : "Forget all"}</button> : null}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[180px_minmax(180px,0.7fr)_minmax(260px,1.3fr)_auto]">
        <label className="text-xs font-medium text-on-surface-variant">{ru ? "Тип" : "Type"}<select value={category} onChange={(event) => setCategory(event.target.value as PersonalMemoryCategory)} className="mt-2 min-h-11 w-full border border-outline-variant/50 bg-surface px-3 text-sm text-primary outline-none focus:border-primary">{PERSONAL_MEMORY_CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item][ru ? "ru" : "en"]}</option>)}</select></label>
        <label className="text-xs font-medium text-on-surface-variant">{ru ? "Название" : "Label"}<input value={label} onChange={(event) => setLabel(event.target.value.slice(0, 80))} placeholder={ru ? "Например: TK LAB" : "For example: TK LAB"} className="mt-2 min-h-11 w-full border border-outline-variant/50 bg-surface px-3 text-sm text-primary outline-none focus:border-primary" /></label>
        <label className="text-xs font-medium text-on-surface-variant">{ru ? "Что помнить" : "What to remember"}<input value={value} onChange={(event) => setValue(event.target.value.slice(0, 500))} placeholder={ru ? "Короткий факт, цель или предпочтение" : "A short fact, goal, or preference"} className="mt-2 min-h-11 w-full border border-outline-variant/50 bg-surface px-3 text-sm text-primary outline-none focus:border-primary" /></label>
        <div className="flex items-end gap-2"><button type="button" onClick={submit} disabled={!label.trim() || !value.trim()} className="flex min-h-11 items-center justify-center gap-2 bg-primary px-4 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-40">{editing ? <Pencil size={16} /> : <Plus size={16} />}{editing ? (ru ? "Сохранить" : "Save") : (ru ? "Добавить" : "Add")}</button>{editing ? <button type="button" onClick={resetForm} className="grid min-h-11 min-w-11 place-items-center border border-outline-variant/50 bg-surface text-primary" aria-label={ru ? "Отмена" : "Cancel"}><X size={17} /></button> : null}</div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {entries.map((entry) => (
          <article key={entry.id} className="border border-outline-variant/40 bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">{CATEGORY_LABELS[entry.category][ru ? "ru" : "en"]}</p><h3 className="mt-2 break-words text-sm font-semibold text-primary">{entry.label}</h3><p className="mt-2 break-words text-sm leading-6 text-on-surface-variant">{entry.value}</p></div>
              <div className="flex shrink-0 gap-1"><button type="button" onClick={() => beginEdit(entry)} className="grid size-9 place-items-center text-on-surface-variant hover:bg-surface-container hover:text-primary" aria-label={ru ? "Изменить" : "Edit"}><Pencil size={15} /></button><button type="button" onClick={() => setStore(deletePersonalMemory(entry.id))} className="grid size-9 place-items-center text-on-surface-variant hover:bg-surface-container hover:text-primary" aria-label={ru ? "Забыть" : "Forget"}><Trash2 size={15} /></button></div>
            </div>
            <p className="mt-3 border-t border-outline-variant/30 pt-3 text-[11px] leading-5 text-on-surface-variant">{ru ? "Источник: сохранено вами вручную. Erma не может создать эту запись скрытно." : "Source: saved manually by you. Erma cannot create this entry silently."}</p>
          </article>
        ))}
        {store && entries.length === 0 ? <div className="border border-dashed border-outline-variant/50 bg-surface p-5 text-sm leading-6 text-on-surface-variant md:col-span-2">{ru ? "Память пока пустая. Добавьте только то, что действительно должно переноситься между диалогами." : "Memory is empty. Add only what should genuinely carry across conversations."}</div> : null}
      </div>
    </section>
  );
}
