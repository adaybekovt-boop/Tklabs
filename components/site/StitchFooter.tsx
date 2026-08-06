import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function StitchFooter() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const footerIntro = locale === "ru"
    ? "Навигация, документы и история изменений — без повторения основного wordmark внизу каждой страницы."
    : "Navigation, documentation, and release history without repeating the primary wordmark at the bottom of every page.";
  const footerLabel = locale === "ru" ? "Частная AI-среда" : "Private AI workspace";

  return (
    <footer className="mt-section-gap border-t-[0.5px] border-primary bg-surface">
      <div className="stitch-container py-10">
        <div className="flex flex-col items-start justify-between gap-10 md:flex-row">
          <div className="max-w-sm">
            <p className="label-caps text-secondary">{footerLabel}</p>
            <p className="mt-4 text-sm leading-[1.7] text-on-surface-variant">{footerIntro}</p>
          </div>
          <nav className="grid w-full grid-cols-2 gap-x-6 gap-y-3 text-[13px] text-secondary sm:grid-cols-3 md:w-auto md:min-w-[520px] md:gap-x-8 md:text-[14px]" aria-label={text.nav.documentation}>
            <Link className="transition-colors hover:text-primary" href="/models">{text.footer.models}</Link>
            <Link className="transition-colors hover:text-primary" href="/access">{text.footer.access}</Link>
            <Link className="transition-colors hover:text-primary" href="/documentation">{text.footer.documentation}</Link>
            <Link className="transition-colors hover:text-primary" href="/developers">{text.footer.developers}</Link>
            <Link className="transition-colors hover:text-primary" href="/patch-notes">{text.footer.patchNotes}</Link>
            <Link className="transition-colors hover:text-primary" href="/status">{text.footer.status}</Link>
            <Link className="transition-colors hover:text-primary" href="/privacy">{text.footer.privacy}</Link>
            <Link className="transition-colors hover:text-primary" href="/legal/terms">{text.footer.terms}</Link>
            <Link className="transition-colors hover:text-primary" href="/legal/api">{text.footer.api}</Link>
            <Link className="transition-colors hover:text-primary" href="/truth">{text.footer.truth}</Link>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-outline-variant pt-5 text-xs text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026</span>
          <span>{locale === "ru" ? "Сделано для спокойной и проверяемой работы" : "Built for calm, verifiable work"}</span>
        </div>
      </div>
    </footer>
  );
}
