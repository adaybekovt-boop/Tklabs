"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { loadArchive, type ArchivedSession } from "@/lib/local-archive";

export function ConversationArchive({ locale, onNavigate, headingId = "conversation-history-title" }: { locale: Locale; onNavigate?: () => void; headingId?: string }) {
  const text = getDictionary(locale);
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);

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
  const dateFormatter = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "2-digit", month: "short" });

  return (
    <section className="mt-8 border-t-[0.5px] border-primary pt-6" aria-labelledby={headingId}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={headingId} className="label-caps text-secondary">{text.chat.history}</h2>
        <span className="label-caps text-secondary">{sessions.length}</span>
      </div>
      {sessions.length === 0 ? (
        <p className="text-[13px] leading-[1.6] text-on-surface-variant">{text.chat.historyEmpty}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/playground?session=${encodeURIComponent(session.id)}`}
              onClick={onNavigate}
              className={"group border px-3 py-3 transition-colors hover:border-primary " + (session.id === activeSession ? "border-primary bg-surface-container-low" : "border-transparent")}
            >
              <span className="block truncate text-[13px] text-primary">{session.title}</span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">
                {dateFormatter.format(new Date(session.updatedAt))} · {session.messages.length}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
