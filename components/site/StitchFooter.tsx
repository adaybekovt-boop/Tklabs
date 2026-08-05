import Link from "next/link";

import { SiteLogo } from "@/components/site/SiteLogo";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function StitchFooter() {
  const text = getDictionary(await getLocale());

  return (
    <footer className="mt-section-gap border-t-[0.5px] border-primary bg-surface">
      <div className="stitch-container flex flex-col items-start justify-between gap-8 py-8 md:flex-row md:items-center">
        <Link href="/" aria-label="TK LAB"><SiteLogo /></Link>
        <nav className="grid w-full grid-cols-2 gap-x-6 gap-y-3 text-[13px] text-secondary md:flex md:w-auto md:flex-wrap md:gap-6 md:text-[14px]" aria-label={text.nav.documentation}>
          <Link href="/models">{text.footer.models}</Link>
          <Link href="/access">{text.footer.access}</Link>
          <Link href="/documentation">{text.footer.documentation}</Link>
          <Link href="/developers">{text.footer.developers}</Link>
          <Link href="/patch-notes">{text.footer.patchNotes}</Link>
          <Link href="/privacy">{text.footer.privacy}</Link>
          <Link href="/legal/terms">{text.footer.terms}</Link>
          <Link href="/legal/api">{text.footer.api}</Link>
          <Link href="/truth">{text.footer.truth}</Link>
          <Link href="/status">{text.footer.status}</Link>
        </nav>
        <span className="max-w-[240px] text-[13px] text-secondary md:max-w-none">{text.footer.copyright}</span>
      </div>
    </footer>
  );
}
