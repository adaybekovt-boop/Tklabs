import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { StitchHeader } from "@/components/site/StitchHeader";
import {
  GlassCard,
  GlassCardDescription,
  GlassCardFooter,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const LOGIN_BG_IMAGE = "/images/login/login-bg.jpg";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/playground");

  const locale = await getLocale();
  const text = getDictionary(locale);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black text-white">
      {/* Background Image: edge to edge from the very top */}
      <div className="absolute inset-0 z-0">
        <Image
          src={LOGIN_BG_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-80"
        />
        {/* Smooth vignette fade - no hard cuts anywhere */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/40" />
      </div>

      <div className="relative z-10">
        <StitchHeader transparent />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center p-4 py-8 sm:p-6 md:p-10">
        <ScrollReveal className="w-full max-w-md">
          <GlassCard data-login-card className="backdrop-blur-xl">
            <GlassCardHeader>
              <p className="label-caps text-white/60">{text.login.account}</p>
              <GlassCardTitle>{text.login.title}</GlassCardTitle>
              <GlassCardDescription className="mt-1 text-white/70">
                {text.login.description}
              </GlassCardDescription>
            </GlassCardHeader>

            <GlassCardFooter className="mt-2">
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/playground" });
                }}
                className="w-full"
              >
                <button
                  type="submit"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#fff] px-5 text-sm font-semibold text-black transition-transform hover:scale-[1.01] hover:bg-[#fff]/90 active:scale-[0.99]"
                >
                  <GoogleIcon className="size-4.5 shrink-0" />
                  <span>{text.login.google}</span>
                </button>
              </form>
              <p className="mt-2 text-center text-xs leading-relaxed text-white/50">{text.login.note}</p>
              <div className="mt-3 border-t border-white/10 pt-4 text-center">
                <Link
                  href="/supported-countries"
                  className="text-[11px] uppercase tracking-[0.12em] text-white/60 transition-colors hover:text-white"
                >
                  {locale === "ru" ? "Поддерживаемые страны и регионы" : "Supported countries and regions"}
                </Link>
              </div>
            </GlassCardFooter>
          </GlassCard>
        </ScrollReveal>
      </main>
    </div>
  );
}