"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SiteNav } from "@/components/site/SiteNav";

export function LoginPage() {
  const { copy } = useLanguage();

  return (
    <main className="auth-page">
      <SiteNav />
      <section className="auth-card">
        <div className="auth-mark" aria-hidden="true">II</div>
        <span className="eyebrow text-[#e7ff49]">AUTH / GOOGLE</span>
        <h1>{copy.auth.title}</h1>
        <p>{copy.auth.subtitle}</p>
        <GoogleSignInButton label={copy.auth.continueGoogle} />
        <div className="auth-security">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>{copy.auth.security}</span>
        </div>
        <Link className="auth-back-link" href="/">
          <ArrowLeft size={14} aria-hidden="true" />
          {copy.auth.back}
        </Link>
      </section>
    </main>
  );
}
