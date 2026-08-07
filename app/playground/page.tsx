import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ErmaNovaWorkspace } from "@/components/playground/ErmaNovaWorkspace";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getLocale } from "@/lib/locale";

export default async function PlaygroundPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locale = await getLocale();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
      <StitchHeader active="laboratory" chatMode />
      <main className="playground-shell flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <Suspense fallback={null}>
          <ErmaNovaWorkspace locale={locale} />
        </Suspense>
      </main>
    </div>
  );
}
