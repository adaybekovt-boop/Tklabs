import type { Metadata } from "next";

import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { WorkspaceVault } from "@/components/vault/WorkspaceVault";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Workspace Vault · TK LAB",
  description: "Export, verify, and restore TK LAB local workspace data.",
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
              ? "Создайте переносимую резервную копию рабочих данных, проверьте её целостность и восстановите на этом или другом устройстве без облачной синхронизации."
              : "Create a portable backup of your workspace, verify its integrity, and restore it on this or another device without cloud synchronization."}
          </p>
        </section>

        <WorkspaceVault locale={locale} />
      </main>
      <StitchFooter />
    </>
  );
}
