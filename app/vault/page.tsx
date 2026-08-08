import type { Metadata } from "next";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { WorkspaceSyncPanel } from "@/components/vault/WorkspaceSyncPanel";
import { WorkspaceVault } from "@/components/vault/WorkspaceVault";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Workspace Vault · TK LAB",
  description: "Export, verify, restore, and optionally synchronize TK LAB workspace data.",
};

export default async function WorkspaceVaultPage() {
  const locale = await getLocale();
  const ru = locale === "ru";

  return (
    <>
      <StitchHeader />
      <main className="stitch-container min-h-screen pb-section-gap pt-8 sm:pt-12">
        <section className="mb-8 border-b border-outline-variant/30 pb-8 sm:mb-10 sm:pb-10">
          <p className="label-caps text-secondary">TK LAB · DATA PORTABILITY</p>
          <h1 className="display-title mt-4 max-w-5xl">{ru ? "Локальные данные под вашим контролем" : "Your local workspace, under your control"}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-on-surface-variant sm:text-lg">
            {ru
              ? "Создайте переносимую резервную копию, проверьте её целостность и восстановите на другом устройстве. При необходимости можно вручную включить зашифрованный snapshot sync — local-first остаётся стандартом."
              : "Create a portable backup, verify its integrity, and restore it on another device. When needed, you can manually use encrypted snapshot sync while local-first remains the default."}
          </p>
        </section>

        <WorkspaceVault locale={locale} />
        <WorkspaceSyncPanel locale={locale} />
      </main>
      <StitchFooter />
    </>
  );
}
