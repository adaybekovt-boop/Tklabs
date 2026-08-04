"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { AuthDotGrid } from "@/components/auth/AuthDotGrid";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export function LoginPage() {
  const { copy } = useLanguage();

  return (
    <main className="auth-page">
      <AuthDotGrid />
      <div className="auth-vignette" aria-hidden="true" />

      <Link className="auth-brand-lockup" href="/" aria-label="Imaginary Intelligence — главная">
        <span className="brand-mark" aria-hidden="true"><img src="/tk-logo.png" alt="" /></span>
        <span><strong>IMAGINARY</strong><small>INTELLIGENCE / FACILITY</small></span>
      </Link>

      <section className="auth-card">
        <div className="auth-mark auth-mark-image" aria-hidden="true"><img src="/tk-logo.png" alt="" /></div>
        <span className="eyebrow text-[#e7ff49]">AUTH / GOOGLE</span>
        <h1>{copy.auth.title}</h1>
        <p>{copy.auth.subtitle}</p>

        <GoogleSignInButton label={copy.auth.continueGoogle} />

        <div className="auth-security">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>{copy.auth.security}</span>
        </div>

        <p className="auth-legal">
          {copy.auth.legalNotice} <Link href="/legal/terms">{copy.auth.legalTerms}</Link> {copy.auth.legalAnd} <Link href="/legal/privacy">{copy.auth.legalPrivacy}</Link>.
        </p>

        <Link className="auth-back-link" href="/">
          <ArrowLeft size={14} aria-hidden="true" />
          {copy.auth.back}
        </Link>
      </section>
    </main>
  );
}
