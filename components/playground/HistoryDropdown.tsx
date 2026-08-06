"use client";

import { History, Plus, X } from "lucide-react";
import { useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import { ChatOverlay } from "@/components/playground/ChatOverlay";

import { ConversationArchive } from "./ConversationArchive";

export function HistoryDropdown({
  locale,
  open,
  onOpenChange,
}: {
  locale: Locale;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const text = getDictionary(locale);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  function setOpen(next: boolean) {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="chat-icon-button grid size-10 place-items-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-secondary-container transition-[background-color,color,transform] hover:-translate-y-px hover:border-primary hover:text-primary"
        onClick={() => setOpen(!isOpen)}
        aria-label={text.chat.history}
        aria-expanded={isOpen}
        aria-controls="conversation-history-dropdown"
      >
        <Plus size={17} className="transition-transform duration-300" style={{ transform: isOpen ? "rotate(45deg)" : undefined }} />
      </button>

      <ChatOverlay open={isOpen} onClose={() => setOpen(false)} labelledBy="dropdown-conversation-history-title" position="popover" className="p-3">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-2 pb-3">
          <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-2xl bg-surface-container-low text-primary"><History size={15} /></span><h2 id="dropdown-conversation-history-title" className="label-caps text-primary">{text.chat.history}</h2></div>
          <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full text-on-secondary-container transition-colors hover:bg-surface-container-low hover:text-primary" aria-label={text.chat.close}><X size={15} /></button>
        </div>
        <ConversationArchive locale={locale} onNavigate={() => setOpen(false)} headingId="dropdown-conversation-history-list-title" compact />
      </ChatOverlay>
    </div>
  );
}
