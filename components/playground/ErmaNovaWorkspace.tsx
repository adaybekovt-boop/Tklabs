"use client";

import { PlaygroundChat } from "./PlaygroundChat";
import type { Locale } from "@/lib/i18n";

export function ErmaNovaWorkspace({ locale }: { locale: Locale }) {
  return <div className="workspace-browser flex h-full min-h-0 flex-1 overflow-hidden bg-surface" data-erma-nova-workspace><PlaygroundChat locale={locale} /></div>;
}
