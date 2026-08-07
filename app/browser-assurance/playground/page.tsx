import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ErmaNovaWorkspace } from "@/components/playground/ErmaNovaWorkspace";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getLocale } from "@/lib/locale";

const BROWSER_ASSURANCE_HEADER = "x-tklabs-browser-assurance";
const BROWSER_ASSURANCE_MARKER = "tklabs-playwright-v1";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export default async function BrowserAssurancePlaygroundPage() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("host") ?? "").split(":", 1)[0].toLowerCase();
  const marker = requestHeaders.get(BROWSER_ASSURANCE_HEADER);

  if (!LOCAL_HOSTS.has(host) || marker !== BROWSER_ASSURANCE_MARKER) notFound();

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
