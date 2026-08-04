import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { auth } from "@/auth";
import { ConversationArchive } from "@/components/playground/ConversationArchive";
import { PlaygroundChat } from "@/components/playground/PlaygroundChat";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function PlaygroundPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locale = await getLocale();
  const text = getDictionary(locale);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
      <StitchHeader active="laboratory" />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[300px] shrink-0 flex-col overflow-y-auto border-r-[0.5px] border-primary bg-white md:flex">
          <div className="p-6">
            <Link href="/playground" className="quiet-button w-full justify-between px-4">
              {text.chat.newDialog} <Plus size={17} />
            </Link>
            <ConversationArchive locale={locale} />
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <Suspense fallback={null}>
            <PlaygroundChat locale={locale} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
