import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TermsDocument } from "@/components/legal/TermsDocument";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getLocale } from "@/lib/locale";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";
import { CURRENT_TERMS_VERSION, getTerms } from "@/lib/terms";

export const dynamic = "force-dynamic";

export default async function AdminTermsPage() {
  const session = await auth();
  if (!isPrivilegedAiEmail(session?.user?.email)) redirect("/");

  const locale = await getLocale();
  const primary = getTerms(locale);
  const secondary = getTerms(locale === "ru" ? "en" : "ru");

  return (
    <>
      <StitchHeader />
      <main className="stitch-container py-section-gap">
        <header className="mb-section-gap border-b border-primary pb-8">
          <p className="label-caps mb-7 text-secondary">TK LAB / ADMIN</p>
          <h1 className="display-title">{primary.title}</h1>
          <p className="mt-6 max-w-2xl text-[18px] leading-[1.6] text-on-surface-variant">{primary.intro}</p>
          <p className="mt-4 text-[13px] text-secondary">{primary.versionLabel} {CURRENT_TERMS_VERSION} · {primary.effectiveDate}</p>
        </header>
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
          <section>
            <div className="mb-10 border-b border-primary pb-5">
              <p className="label-caps text-secondary">{primary.languageName}</p>
              <h2 className="headline-title mt-3">{primary.label}</h2>
            </div>
            <TermsDocument language={locale} />
          </section>
          <section>
            <div className="mb-10 border-b border-primary pb-5">
              <p className="label-caps text-secondary">{secondary.languageName}</p>
              <h2 className="headline-title mt-3">{secondary.label}</h2>
            </div>
            <TermsDocument language={locale === "ru" ? "en" : "ru"} />
          </section>
        </div>
      </main>
      <StitchFooter />
    </>
  );
}
