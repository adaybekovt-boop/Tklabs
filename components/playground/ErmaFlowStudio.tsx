"use client";

import { useState } from "react";
import type { ChatInputSubmitMeta } from "@/components/ui/ai-chat-input";
import type { Locale } from "@/lib/i18n";

export function ErmaFlowStudio({ locale, model, pending, onSubmit }: { locale: Locale; model: string; pending: boolean; onSubmit: (prompt: string, meta: ChatInputSubmitMeta) => boolean }) {
  const [prompt, setPrompt] = useState("");
  const ru = locale === "ru";
  return <section className="workspace-task-composer" aria-label={ru ? "Задача" : "Task"}>
    <h3>{ru ? "Новая задача" : "New task"}</h3>
    <p>{ru ? "Опишите результат. Задача выполнится в текущем диалоге; готовый файл появится рядом." : "Describe the result. The task runs in this conversation; the completed file opens beside it."}</p>
    <label htmlFor="workspace-task-input">{ru ? "Что подготовить?" : "What should Erma prepare?"}</label>
    <textarea id="workspace-task-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} rows={5} placeholder={ru ? "Например, техническую спецификацию функции…" : "For example, a feature specification…"} />
    <button type="button" disabled={!prompt.trim() || pending} onClick={() => { if (onSubmit(prompt.trim(), { model, effort: "medium", attachments: [] })) setPrompt(""); }}>{ru ? "Начать задачу" : "Start task"}</button>
  </section>;
}
