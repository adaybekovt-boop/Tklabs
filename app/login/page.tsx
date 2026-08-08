import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/playground");

  const locale = await getLocale();
  const text = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <StitchHeader />
      <main className="stitch-container grid flex-1 md:grid-cols-2">
        <ScrollReveal className="flex flex-col justify-center border-primary py-14 md:border-r-[0.5px] md:py-20 md:pr-20">
          <p className="label-caps mb-8 text-secondary">{text.login.account}</p>
          <h1 className="display-title mb-6">{text.login.title}</h1>
          <p className="max-w-md text-[18px] leading-[1.7] text-on-surface-variant">{text.login.description}</p>
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-primary bg-primary text-[12px] uppercase tracking-[0.1em] sm:grid-cols-2 md:mt-16">
            <span className="bg-surface p-5">{text.login.identity}</span>
            <span className="bg-surface p-5">{text.login.session}</span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.12} className="flex items-center pb-14 pt-4 md:py-20 md:pl-20">
          <div className="w-full overflow-hidden rounded-3xl border border-primary bg-surface-container-lowest p-8 md:p-12" data-login-card>
            <p className="label-caps mb-8 text-secondary">{text.login.method}</p>
            <form action={async () => { "use server"; await signIn("google", { redirectTo: "/playground" }); }}>
              <button type="submit" className="quiet-button quiet-button--dark w-full">{text.login.google}</button>
            </form>
            <p className="mt-7 text-[12px] leading-[1.6] text-secondary">{text.login.note}</p>
            <div className="mt-8 border-t border-outline-variant pt-5">
              <Link
                href="/supported-countries"
                className="text-[11px] uppercase tracking-[0.12em] text-secondary hover:text-on-surface"
              >
                {locale === "ru" ? "Поддерживаемые страны и регионы" : "Supported countries and regions"}
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </main>
    </div>
  );
}