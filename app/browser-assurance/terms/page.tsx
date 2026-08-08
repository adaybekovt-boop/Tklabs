import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { TermsGate } from "@/components/legal/TermsGate";
import { getLocale } from "@/lib/locale";

const BROWSER_ASSURANCE_HEADER = "x-tklabs-browser-assurance";
const BROWSER_ASSURANCE_MARKER = "tklabs-playwright-v1";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export default async function BrowserAssuranceTermsPage() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("host") ?? "").split(":", 1)[0].toLowerCase();
  const marker = requestHeaders.get(BROWSER_ASSURANCE_HEADER);

  if (!LOCAL_HOSTS.has(host) || marker !== BROWSER_ASSURANCE_MARKER) notFound();

  const locale = await getLocale();

  return (
    <div className="min-h-[300dvh] bg-surface">
      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="font-serif text-4xl">Terms viewport harness</h1>
        <p className="mt-[220dvh]">Bottom marker</p>
      </main>
      <TermsGate enabled locale={locale} />
    </div>
  );
}
