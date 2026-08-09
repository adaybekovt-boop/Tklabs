import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const footerLinkClass = "flex min-h-11 items-center rounded-xl px-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary";
const desktopLinkClass = "text-on-surface-variant transition-colors hover:text-primary";

export async function StitchFooter() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const footerLabel = locale === "ru" ? "Частная AI-среда" : "Private AI workspace";
  const productTitle = locale === "ru" ? "Продукт" : "Product";
  const resourcesTitle = locale === "ru" ? "Ресурсы" : "Resources";
  const legalTitle = locale === "ru" ? "Правовая информация" : "Legal";
  const chatLabel = locale === "ru" ? "AI-чат" : "AI chat";
  const supportLabel = locale === "ru" ? "Поддержать проект" : "Support the project";
  const vaultLabel = "Workspace Vault";

  return (
    <footer className="mt-section-gap border-t border-outline-variant/30 bg-surface">
      <div className="stitch-container py-8 md:py-10">
        <div className="md:hidden">
          <p className="label-caps mb-5 text-secondary">{footerLabel}</p>
          <div className="divide-y divide-outline-variant border-y border-outline-variant">
            <details open className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium text-primary">
                {productTitle}
                <span className="text-lg leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <nav className="grid w-full grid-cols-2 gap-1 pb-4" aria-label={productTitle}>
                <Link className={footerLinkClass} href="/models">{text.footer.models}</Link>
                <Link className={footerLinkClass} href="/access">{text.footer.access}</Link>
                <Link className={footerLinkClass} href="/playground">{chatLabel}</Link>
                <Link className={footerLinkClass} href="/status">{text.footer.status}</Link>
              </nav>
            </details>

            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium text-primary">
                {resourcesTitle}
                <span className="text-lg leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <nav className="grid w-full grid-cols-2 gap-1 pb-4" aria-label={resourcesTitle}>
                <Link className={footerLinkClass} href="/documentation">{text.footer.documentation}</Link>
                <Link className={footerLinkClass} href="/developers">{text.footer.developers}</Link>
                <Link className={footerLinkClass} href="/patch-notes">{text.footer.patchNotes}</Link>
                <Link className={footerLinkClass} href="/truth">{text.footer.truth}</Link>
                <Link className={footerLinkClass} href="/vault">{vaultLabel}</Link>
                <Link className={footerLinkClass} href="/support">{supportLabel}</Link>
              </nav>
            </details>

            <details className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium text-primary">
                {legalTitle}
                <span className="text-lg leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <nav className="grid w-full grid-cols-2 gap-1 pb-4" aria-label={legalTitle}>
                <Link className={footerLinkClass} href="/privacy">{text.footer.privacy}</Link>
                <Link className={footerLinkClass} href="/legal/terms">{text.footer.terms}</Link>
                <Link className={footerLinkClass} href="/legal/api">{text.footer.api}</Link>
              </nav>
            </details>
          </div>
        </div>

        <div className="hidden items-start justify-between gap-10 md:flex">
          <div className="max-w-sm">
            <p className="label-caps text-secondary">{footerLabel}</p>
            <p className="mt-4 text-sm leading-[1.7] text-on-surface-variant">
              {locale === "ru"
                ? "Навигация, документы и история изменений."
                : "Navigation, documentation, and release history."}
            </p>
          </div>
          <div className="grid min-w-[620px] grid-cols-3 gap-10">
            <nav aria-label={productTitle}>
              <p className="label-caps mb-4 text-secondary">{productTitle}</p>
              <div className="grid gap-3 text-sm">
                <Link className={desktopLinkClass} href="/models">{text.footer.models}</Link>
                <Link className={desktopLinkClass} href="/access">{text.footer.access}</Link>
                <Link className={desktopLinkClass} href="/playground">{chatLabel}</Link>
                <Link className={desktopLinkClass} href="/status">{text.footer.status}</Link>
              </div>
            </nav>
            <nav aria-label={resourcesTitle}>
              <p className="label-caps mb-4 text-secondary">{resourcesTitle}</p>
              <div className="grid gap-3 text-sm">
                <Link className={desktopLinkClass} href="/documentation">{text.footer.documentation}</Link>
                <Link className={desktopLinkClass} href="/developers">{text.footer.developers}</Link>
                <Link className={desktopLinkClass} href="/patch-notes">{text.footer.patchNotes}</Link>
                <Link className={desktopLinkClass} href="/truth">{text.footer.truth}</Link>
                <Link className={desktopLinkClass} href="/vault">{vaultLabel}</Link>
                <Link className={desktopLinkClass} href="/support">{supportLabel}</Link>
              </div>
            </nav>
            <nav aria-label={legalTitle}>
              <p className="label-caps mb-4 text-secondary">{legalTitle}</p>
              <div className="grid gap-3 text-sm">
                <Link className={desktopLinkClass} href="/privacy">{text.footer.privacy}</Link>
                <Link className={desktopLinkClass} href="/legal/terms">{text.footer.terms}</Link>
                <Link className={desktopLinkClass} href="/legal/api">{text.footer.api}</Link>
              </div>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-outline-variant pt-5 text-xs text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026</span>
          <span>{locale === "ru" ? "Сделано для спокойной и проверяемой работы" : "Built for calm, verifiable work"}</span>
        </div>
      </div>
    </footer>
  );
}
