import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PlaygroundChat } from "@/components/playground/PlaygroundChat";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getLocale } from "@/lib/locale";

export default async function PlaygroundPage() {
  const localPreview = process.env.TKLABS_LOCAL_PREVIEW === "true";
  const session = localPreview ? { user: { name: "TK Labs Preview" } } : await auth();
  if (!session?.user) redirect("/login");

  const locale = await getLocale();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
      <StitchHeader active="laboratory" />
      <main className="playground-shell flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <Suspense fallback={null}>
            <PlaygroundChat locale={locale} />
          </Suspense>
      </main>
    </div>
  );
}
