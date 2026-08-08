import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/playground");

  const locale = await getLocale();
  const text = getDictionary(locale);
  const legalLabel = "text-[11px] font-semibold uppercase tracking-[0.11em] text-secondary hover:text-primary";

  return (
    <>
      <StitchHeader />
      <main className="stitch-container flex min-h-[72dvh] items-center justify-center py-12 sm:py-20 lg:min-h-[calc(100dvh-80px)]">
        <ScrollReveal className="w-full max-w-xl">
          <section className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_24px_80px_rgba(15,23,42,.07)] sm:p-10 lg:p-12">
            <p className="label-caps text-secondary">{text.login.account}</p>
            <h1 className="mt-5 font-serif text-[clamp(2.4rem,7vw,4.8rem)] leading-[.98] tracking-[-.04em] text-primary">{text.login.title}</h1>
            <p className="mt-6 max-w-lg text-[16px] leading-[1.75] text-on-surface-variant sm:text-[17px]">{text.login.description}</p>

            <form className="mt-10" action={async () => { "use server"; await signIn("google", { redirectTo: "/playground" }); }}>
              <button type="submit" className="quiet-button quiet-button--dark min-h-12 w-full">{text.login.google}</button>
            </form>

            <p className="mt-6 text-[12px] leading-[1.65] text-secondary">{text.login.note}</p>

            <nav className="mt-8 grid grid-cols-1 gap-3 border-t border-outline-variant/70 pt-6 sm:grid-cols-2" aria-label={locale === "ru" ? "Правовая информация" : "Legal information"}>
              <Link href="/legal/terms" className={legalLabel}>{locale === "ru" ? "Пользовательское соглашение" : "Terms of use"}</Link>
              <Link href="/legal/privacy" className={legalLabel}>{locale === "ru" ? "Конфиденциальность" : "Privacy"}</Link>
              <Link href="/supported-countries" className={legalLabel}>{locale === "ru" ? "Поддерживаемые страны" : "Supported countries"}</Link>
            </nav>
          </section>
        </ScrollReveal>
      </main>
      <StitchFooter />
    </>
  );
}
