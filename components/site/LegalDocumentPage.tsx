"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";

export type LegalDocument = "terms" | "privacy";

export function LegalDocumentPage({ doc }: { doc: LegalDocument }) {
  const { copy } = useLanguage();
  const document = copy.legal[doc];

  return (
    <main className="legal-page">
      <header className="legal-header"><Link href="/" className="status-back"><ArrowLeft size={14} /> {copy.common.backToFacility}</Link><span className="truth-header-mark">II / {copy.legal.label.toLowerCase()}</span><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{copy.legal.lastRevised}</span></header>
      <article className="legal-document"><span className="eyebrow text-[#e7ff49]">{copy.legal.label} / {doc}</span><h1>{document.title}</h1><p className="legal-intro">{document.intro}</p>{document.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</article>
      <footer className="legal-footer"><Link href="/truth">{copy.common.readDisclosure}</Link><Link href="/">{copy.common.returnToTheatre}</Link></footer>
    </main>
  );
}
