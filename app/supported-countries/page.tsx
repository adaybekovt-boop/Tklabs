import Link from "next/link";

import { SiteLogo } from "@/components/site/SiteLogo";
import { ALWAYS_SUPPORTED_COUNTRY_CODES, RESTRICTED_COUNTRY_CODES } from "@/lib/country-access";
import { getLocale } from "@/lib/locale";

const restrictedNames = {
  ru: {
    BY: "Беларусь",
    CU: "Куба",
    IR: "Иран",
    KP: "КНДР",
    RU: "Россия",
    SY: "Сирия",
  },
  en: {
    BY: "Belarus",
    CU: "Cuba",
    IR: "Iran",
    KP: "North Korea",
    RU: "Russia",
    SY: "Syria",
  },
} as const;

export default async function SupportedCountriesPage() {
  const locale = await getLocale();
  const isRussian = locale === "ru";
  const names = restrictedNames[locale];

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="border-b border-outline-variant/30">
        <div className="stitch-container flex min-h-[92px] items-center justify-between gap-6">
          <Link href="/" aria-label="TK LAB"><SiteLogo /></Link>
          <Link href="/login" className="text-[12px] uppercase tracking-[0.1em] text-secondary hover:text-on-surface">
            {isRussian ? "Вернуться ко входу" : "Back to sign in"}
          </Link>
        </div>
      </header>

      <main className="stitch-container py-16 md:py-24">
        <div className="max-w-4xl">
          <p className="label-caps mb-6 text-secondary">TK LAB / {isRussian ? "География доступа" : "Access geography"}</p>
          <h1 className="display-title mb-8">
            {isRussian ? "Поддерживаемые страны и регионы" : "Supported countries and regions"}
          </h1>
          <p className="max-w-3xl text-[18px] leading-[1.7] text-on-surface-variant">
            {isRussian
              ? "TK LAB доступен во всех странах и регионах, кроме перечисленных ниже. Ограничения применяются на сетевой границе до авторизации и распространяются также на AI API."
              : "TK LAB is available in all countries and regions except those listed below. Restrictions are enforced at the network edge before authentication and also apply to the AI API."}
          </p>
        </div>

        <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          <div className="rounded-3xl border border-primary bg-white p-8">
            <p className="label-caps mb-4 text-secondary">{isRussian ? "Поддерживается" : "Supported"}</p>
            <h2 className="text-2xl font-medium">{isRussian ? "Казахстан" : "Kazakhstan"}</h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              {isRussian
                ? `Код ${ALWAYS_SUPPORTED_COUNTRY_CODES[0]}. Казахстан закреплён в политике TK LAB как поддерживаемая страна.`
                : `Code ${ALWAYS_SUPPORTED_COUNTRY_CODES[0]}. Kazakhstan is explicitly protected as a supported country in TK LAB policy.`}
            </p>
          </div>

          <div className="rounded-3xl border border-outline-variant/60 p-8">
            <p className="label-caps mb-5 text-secondary">{isRussian ? "Текущие ограничения" : "Current restrictions"}</p>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-outline-variant bg-outline-variant sm:grid-cols-2">
              {RESTRICTED_COUNTRY_CODES.map((code) => (
                <div key={code} className="flex items-center justify-between gap-4 bg-surface px-5 py-4">
                  <span>{names[code]}</span>
                  <span className="font-mono text-xs text-secondary">{code}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-6 text-secondary">
              {isRussian
                ? "Список формируется по требованиям провайдеров, экспортного контроля и доступности сервиса и может обновляться при изменении этих требований."
                : "The list is based on provider, export-control, and service-availability requirements and may change when those requirements change."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
