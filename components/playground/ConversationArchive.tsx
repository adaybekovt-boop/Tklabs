"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { clearArchive, deleteSession, loadArchive, type ArchivedSession } from "@/lib/local-archive";

type ConversationArchiveProps = {
  locale: Locale;
  onNavigate?: () => void;
  headingId?: string;
  compact?: boolean;
};

export function ConversationArchive({ locale, onNavigate, headingId = "conversation-history-title", compact = false }: ConversationArchiveProps) {
  const text = getDictionary(locale);
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setSessions(loadArchive());
    refresh();
    window.addEventListener("tklab:archive-updated", refresh);
    window.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("tklab:archive-updated", refresh);
      window.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const activeSession = searchParams.get("session");
  const filteredSessions = sessions.filter((session) => `${session.title} ${session.model}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const dateFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "2-digit", month: "short" });

  return (
    <section className={compact ? "pt-3" : "mt-8 border-t-[0.5px] border-primary pt-6"} aria-labelledby={headingId}>
      <div className="mb-3 flex items-center justify-between gap-4 px-2">
        <h2 id={headingId} className="label-caps text-secondary">{text.chat.currentSession}</h2>
        <div className="flex items-center gap-2"><span className="label-caps text-secondary">{sessions.length}</span>{sessions.length > 0 && <button type="button" onClick={clearArchive} className="min-h-9 rounded-full px-2 text-[10px] uppercase tracking-[0.08em] text-on-secondary-container hover:bg-surface-container-low hover:text-primary">{text.chat.close}</button>}</div>
      </div>
      {sessions.length > 0 && <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "ru" ? "Поиск диалогов" : "Search conversations"} aria-label={locale === "ru" ? "Поиск диалогов" : "Search conversations"} className="mb-3 h-11 w-full rounded-2xl border border-outline-variant bg-surface-container-low px-3 text-[13px] text-primary outline-none focus:border-primary" />}
      {sessions.length === 0 ? (
        <p className="rounded-2xl bg-surface-container-low px-3 py-4 text-[13px] leading-[1.6] text-on-surface-variant">{text.chat.historyEmpty}</p>
      ) : filteredSessions.length === 0 ? (
        <p className="rounded-2xl bg-surface-container-low px-3 py-4 text-[13px] leading-[1.6] text-on-surface-variant">{locale === "ru" ? "Ничего не найдено." : "No conversations found."}</p>
      ) : (
        <div className="flex max-h-[min(48vh,360px)] flex-col gap-1 overflow-y-auto pr-1">
          {filteredSessions.map((session) => (
            <div key={session.id} className={"group flex items-center gap-2 rounded-2xl border px-3 py-2 transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-primary " + (session.id === activeSession ? "border-primary bg-surface-container-low" : "border-transparent")}>
              <Link href={`/playground?session=${encodeURIComponent(session.id)}`} onClick={onNavigate} className="min-w-0 flex-1 py-1">
                <span className="block truncate text-[13px] text-primary">{session.title}</span>
                <span className="mt-1 block text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">{dateFormatter.format(new Date(session.updatedAt))} · {session.messages.length}</span>
              </Link>
              <button type="button" onClick={() => deleteSession(session.id)} aria-label={`${text.chat.close} ${session.title}`} className="grid size-10 shrink-0 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container hover:text-primary"><span aria-hidden="true">×</span></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
