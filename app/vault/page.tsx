import type { Metadata } from "next";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { PrivacyControlCenter } from "@/components/vault/PrivacyControlCenter";
import { WorkspaceSyncPanel } from "@/components/vault/WorkspaceSyncPanel";
import { WorkspaceVault } from "@/components/vault/WorkspaceVault";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Workspace Vault · TK LAB", description: "Export, verify, restore, synchronize, and erase TK LAB workspace data." };

export default async function WorkspaceVaultPage() {
  const locale = await getLocale(); const ru = locale === "ru";
  return <><StitchHeader /><main className="stitch-container min-h-screen pb-section-gap pt-8 sm:pt-12"><section className="mb-8 border-b border-outline-variant/30 pb-8 sm:mb-10 sm:pb-10"><p className="label-caps text-secondary">TK LAB · DATA CONTROL</p><h1 className="display-title mt-4 max-w-5xl">{ru ? "Данные под вашим контролем" : "Your data, under your control"}</h1><p className="mt-5 max-w-3xl text-base leading-7 text-on-surface-variant sm:text-lg">{ru ? "Local-first остаётся стандартом. Здесь отдельно управляются переносимая локальная копия, опциональный encrypted-at-rest Sync и server-held account data." : "Local-first remains the default. Portable local data, optional encrypted-at-rest Sync, and server-held account data are controlled separately here."}</p></section><WorkspaceVault locale={locale} /><WorkspaceSyncPanel locale={locale} /><PrivacyControlCenter locale={locale} /></main><StitchFooter /></>;
}
