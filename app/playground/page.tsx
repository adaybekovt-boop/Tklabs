import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ErmaNovaWorkspace } from "@/components/playground/ErmaNovaWorkspace";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { isLocalPreviewEnabled } from "@/lib/local-preview";

export default async function PlaygroundPage() {
  const localPreview = isLocalPreviewEnabled();
  const session = localPreview ? { user: { name: "TK Labs Preview" } } : await auth();
  if (!session?.user) redirect("/login");

  const locale = await getLocale();
  const text = getDictionary(locale);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
      <StitchHeader active="laboratory" chatMode />
      <div className="fixed right-14 top-2 z-[90] flex min-h-10 items-center rounded-full border border-outline-variant bg-surface-container-lowest/95 px-2.5 shadow-sm backdrop-blur-md sm:hidden">
        <LanguageToggle locale={locale} label={text.nav.language} />
      </div>
      <main className="playground-shell flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <Suspense fallback={null}>
          <ErmaNovaWorkspace locale={locale} />
        </Suspense>
      </main>
    </div>
  );
}
