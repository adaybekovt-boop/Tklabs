import Link from "next/link";

import { auth } from "@/auth";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

type StitchHeaderProps = {
  active?: "home" | "models" | "access" | "laboratory" | "status" | "documentation" | "developers" | "patch-notes" | "truth";
};

const navigation: Array<{ href: string; key: keyof Dictionary["nav"]; active: NonNullable<StitchHeaderProps["active"]> }> = [
  { href: "/", key: "home", active: "home" },
  { href: "/models", key: "models", active: "models" },
  { href: "/access", key: "access", active: "access" },
  { href: "/playground", key: "laboratory", active: "laboratory" },
  { href: "/status", key: "status", active: "status" },
  { href: "/documentation", key: "documentation", active: "documentation" },
  { href: "/developers", key: "developers", active: "developers" },
  { href: "/patch-notes", key: "patchNotes", active: "patch-notes" },
];

export async function StitchHeader({ active }: StitchHeaderProps) {
  const locale = await getLocale();
  const text = getDictionary(locale);
  let signedIn = false;
  try {
    signedIn = Boolean((await auth())?.user);
  } catch {
    // Public pages should remain available while authentication is being configured.
  }

  return (
    <header className="sticky top-0 z-50 border-b-[0.5px] border-primary bg-surface/95 backdrop-blur-sm">
      <div className="stitch-container flex min-h-[80px] items-center justify-between gap-8">
        <Link href="/" className="shrink-0 font-serif text-[28px] tracking-[-0.03em]">TK LAB</Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label={text.nav.home}>
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={active === item.active ? "border-b border-primary pb-1 font-medium" : "text-secondary hover:text-primary"}
            >
              {text.nav[item.key]}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <LanguageToggle locale={locale} label={text.nav.language} />
          <Link href={signedIn ? "/profile" : "/login"} className="quiet-button min-h-10 px-5">
            {signedIn ? text.nav.profile : text.nav.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
