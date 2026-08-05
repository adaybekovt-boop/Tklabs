"use client";

import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/** Renders a model's real chain-of-thought content, collapsed by default. */
export function ReasoningTrace({ thinking, label, showLabel, hideLabel }: { thinking: string; label: string; showLabel: string; hideLabel: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 border border-outline-variant">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="label-caps flex w-full items-center gap-2 px-3 py-2.5 text-left text-on-secondary-container transition-colors hover:text-primary"
      >
        <Brain size={13} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="sr-only">{open ? hideLabel : showLabel}</span>
        <ChevronDown size={13} className={cn("shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="reasoning-trace-enter whitespace-pre-wrap border-t border-outline-variant px-3 py-3 text-[13px] italic leading-[1.7] text-on-secondary-container">
          {thinking}
        </div>
      )}
    </div>
  );
}
