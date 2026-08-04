import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/playground");

  const locale = await getLocale();
  const text = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b-[0.5px] border-primary">
        <div className="stitch-container flex min-h-[92px] items-center justify-between gap-6">
          <Link href="/" className="font-serif text-[28px]">TK LAB</Link>
          <div className="flex items-center gap-5">
            <LanguageToggle locale={locale} label={text.nav.language} />
            <span className="label-caps hidden text-secondary sm:inline">{text.login.secure}</span>
          </div>
        </div>
      </header>
      <main className="stitch-container grid flex-1 md:grid-cols-2">
        <section className="editorial-enter flex flex-col justify-center border-primary py-20 md:border-r-[0.5px] md:pr-20">
          <p className="label-caps mb-8 text-secondary">{text.login.account}</p>
          <h1 className="display-title mb-6">{text.login.title}</h1>
          <p className="max-w-md text-[18px] leading-[1.7] text-on-surface-variant">{text.login.description}</p>
          <div className="mt-16 grid grid-cols-2 gap-px border border-primary bg-primary text-[12px] uppercase tracking-[0.1em]">
            <span className="bg-surface p-5">{text.login.identity}</span>
            <span className="bg-surface p-5">{text.login.session}</span>
          </div>
        </section>
        <section className="editorial-enter-delay flex items-center py-20 md:pl-20">
          <div className="w-full border border-primary bg-white p-8 md:p-12">
            <p className="label-caps mb-10 text-secondary">{text.login.method}</p>
            <form action={async () => { "use server"; await signIn("google", { redirectTo: "/playground" }); }}>
              <button type="submit" className="quiet-button quiet-button--dark w-full">{text.login.google}</button>
            </form>
            <div className="my-10 flex items-center gap-4 text-[11px] uppercase tracking-[0.12em] text-secondary">
              <span className="h-px flex-1 bg-outline-variant" /><span>{text.login.or}</span><span className="h-px flex-1 bg-outline-variant" />
            </div>
            <Link href="/" className="quiet-button w-full">{text.login.back}</Link>
            <p className="mt-10 text-[12px] leading-[1.6] text-secondary">{text.login.note}</p>
          </div>
        </section>
      </main>
    </div>
  );
}