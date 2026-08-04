import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function StitchFooter() {
  const text = getDictionary(await getLocale());

  return (
    <footer className="mt-section-gap border-t-[0.5px] border-primary bg-surface">
      <div className="stitch-container flex flex-col items-start justify-between gap-8 py-8 md:flex-row md:items-center">
        <span className="font-serif text-[28px]">TK LAB</span>
        <nav className="flex flex-wrap gap-6 text-[14px] text-secondary" aria-label={text.nav.documentation}>
          <Link href="/models">{text.footer.models}</Link>
          <Link href="/access">{text.footer.access}</Link>
          <Link href="/documentation">{text.footer.documentation}</Link>
          <Link href="/privacy">{text.footer.privacy}</Link>
          <Link href="/legal/terms">{text.footer.terms}</Link>
          <Link href="/legal/api">{text.footer.api}</Link>
          <Link href="/truth">{text.footer.truth}</Link>
          <Link href="/status">{text.footer.status}</Link>
        </nav>
        <span className="text-[13px] text-secondary">{text.footer.copyright}</span>
      </div>
    </footer>
  );
}