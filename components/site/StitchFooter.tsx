import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function StitchFooter() {
  const locale = await getLocale();
  const text = getDictionary(locale);
  const footerLabel = locale === "ru" ? "Частная AI-среда" : "Private AI workspace";
  const groups = locale === "ru"
    ? [
        {
          title: "Продукт",
          links: [
            ["/models", text.footer.models],
            ["/access", text.footer.access],
            ["/playground", "AI-чат"],
            ["/status", text.footer.status],
          ],
        },
        {
          title: "Ресурсы",
          links: [
            ["/documentation", text.footer.documentation],
            ["/developers", text.footer.developers],
            ["/patch-notes", text.footer.patchNotes],
            ["/truth", text.footer.truth],
          ],
        },
        {
          title: "Правовая информация",
          links: [
            ["/privacy", text.footer.privacy],
            ["/legal/terms", text.footer.terms],
            ["/legal/api", text.footer.api],
          ],
        },
      ]
    : [
        {
          title: "Product",
          links: [
            ["/models", text.footer.models],
            ["/access", text.footer.access],
            ["/playground", "AI chat"],
            ["/status", text.footer.status],
          ],
        },
        {
          title: "Resources",
          links: [
            ["/documentation", text.footer.documentation],
            ["/developers", text.footer.developers],
            ["/patch-notes", text.footer.patchNotes],
            ["/truth", text.footer.truth],
          ],
        },
        {
          title: "Legal",
          links: [
            ["/privacy", text.footer.privacy],
            ["/legal/terms", text.footer.terms],
            ["/legal/api", text.footer.api],
          ],
        },
      ];

  return (
    <footer className="mt-section-gap border-t-[0.5px] border-primary bg-surface">
      <div className="stitch-container py-8 md:py-10">
        <div className="md:hidden">
          <p className="label-caps mb-5 text-secondary">{footerLabel}</p>
          <div className="divide-y divide-outline-variant border-y border-outline-variant">
            {groups.map((group, index) => (
              <details key={group.title} open={index === 0} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium text-primary">
                  {group.title}
                  <span className="text-lg leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <nav className="grid gap-1 pb-4" aria-label={group.title}>
                  {group.links.map(([href, label]) => (
                    <Link
                      key={href}
                      className="flex min-h-11 items-center rounded-xl px-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                      href={href}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </details>
            ))}
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
            {groups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <p className="label-caps mb-4 text-secondary">{group.title}</p>
                <div className="grid gap-3 text-sm">
                  {group.links.map(([href, label]) => (
                    <Link key={href} className="text-on-surface-variant transition-colors hover:text-primary" href={href}>
                      {label}
                    </Link>
                  ))}
                </div>
              </nav>
            ))}
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
