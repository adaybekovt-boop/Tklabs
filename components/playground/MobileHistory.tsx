"use client";

import { History, X } from "lucide-react";
import { useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";

import { ConversationArchive } from "./ConversationArchive";

export function MobileHistory({ locale }: { locale: Locale }) {
  const text = getDictionary(locale);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="grid size-9 shrink-0 place-items-center text-on-secondary-container transition-colors hover:text-primary md:hidden"
        onClick={() => setOpen(true)}
        aria-label={text.chat.history}
        aria-expanded={open}
        aria-controls="mobile-conversation-history"
      >
        <History size={16} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label={text.chat.history}>
          <button
            type="button"
            className="absolute inset-0 bg-primary/55"
            onClick={() => setOpen(false)}
            aria-label={text.chat.close}
          />
          <aside
            id="mobile-conversation-history"
            className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col overflow-y-auto border-r border-primary bg-surface p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant pb-4">
              <h2 className="label-caps text-primary">{text.chat.history}</h2>
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center text-on-secondary-container transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
                aria-label={text.chat.close}
              >
                <X size={17} />
              </button>
            </div>
            <ConversationArchive locale={locale} onNavigate={() => setOpen(false)} headingId="mobile-conversation-history-title" />
          </aside>
        </div>
      )}
    </>
  );
}
