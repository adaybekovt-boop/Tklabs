"use client";

import { Activity, FileText, MessageSquareText, Workflow } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import type { WorkspaceSection } from "@/lib/workspace-events";
import { cn } from "@/lib/utils";

const ITEMS: Array<{ id: WorkspaceSection; ru: string; en: string; icon: typeof MessageSquareText }> = [
  { id: "chat", ru: "Чат", en: "Chat", icon: MessageSquareText },
  { id: "flow", ru: "Flow", en: "Flow", icon: Workflow },
  { id: "artifacts", ru: "Файлы", en: "Artifacts", icon: FileText },
  { id: "runs", ru: "Runs", en: "Runs", icon: Activity },
];

export function MobileWorkspaceSwitcher({
  locale,
  active,
  onSelect,
}: {
  locale: Locale;
  active: WorkspaceSection;
  onSelect: (section: WorkspaceSection) => void;
}) {
  const ru = locale === "ru";
  return (
    <nav
      className="mobile-workspace-switcher md:hidden"
      aria-label={ru ? "Разделы рабочей области" : "Workspace sections"}
      data-mobile-workspace-switcher
    >
      {ITEMS.map(({ id, ru: ruLabel, en, icon: Icon }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={selected ? "page" : undefined}
            aria-pressed={selected}
            className={cn("mobile-workspace-switcher__item", selected && "is-active")}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{ru ? ruLabel : en}</span>
          </button>
        );
      })}
    </nav>
  );
}
