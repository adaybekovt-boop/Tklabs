import type { Metadata } from "next";

import { SupportPanel } from "@/components/support/SupportPanel";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Support TK LAB",
  description: "Voluntary support for the independent TK LAB open-source project.",
  robots: { index: true, follow: true },
};

export default async function SupportPage() {
  const locale = await getLocale();
  const ru = locale === "ru";
  return (
    <>
      <StitchHeader />
      <main className="stitch-container min-h-screen pb-section-gap pt-8 sm:pt-12">
        <section className="mb-8 border-b border-outline-variant/30 pb-8 sm:mb-10 sm:pb-10">
          <p className="label-caps text-secondary">TK LAB · COMMUNITY</p>
          <h1 className="display-title mt-4 max-w-5xl">{ru ? "Независимая разработка, добровольная поддержка" : "Independent development, voluntary support"}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-on-surface-variant sm:text-lg">
            {ru ? "TK LAB остаётся бесплатным open-source проектом. Поддержка не является покупкой, подпиской или оплатой дополнительных AI-функций." : "TK LAB remains a free open-source project. Support is not a purchase, subscription, or payment for additional AI features."}
          </p>
        </section>
        <SupportPanel locale={locale} />
        <section className="mt-8 grid gap-4 border-t border-outline-variant/30 pt-8 md:grid-cols-3">
          <div><p className="text-sm font-semibold text-primary">{ru ? "Что хранит TK LAB" : "What TK LAB stores"}</p><p className="mt-2 text-sm leading-6 text-on-surface-variant">{ru ? "Страница поддержки не создаёт профиль донора и не сохраняет введённые имя, сообщение или сумму." : "The support page creates no donor profile and does not persist the entered name, message, or amount."}</p></div>
          <div><p className="text-sm font-semibold text-primary">{ru ? "Что хранит банк" : "What the bank stores"}</p><p className="mt-2 text-sm leading-6 text-on-surface-variant">{ru ? "Сам перевод выполняется вне TK LAB. Данные операции обрабатываются вашим банком и банком получателя по их правилам." : "The transfer itself happens outside TK LAB. Transaction data is handled by your bank and the recipient bank under their rules."}</p></div>
          <div><p className="text-sm font-semibold text-primary">{ru ? "Почему нет публичных алертов" : "Why there are no public alerts"}</p><p className="mt-2 text-sm leading-6 text-on-surface-variant">{ru ? "Без проверяемого банковского webhook сайт не может честно подтвердить перевод. Публичные donation-alert события появятся только вместе с платёжным провайдером, который подписывает подтверждения." : "Without a verifiable bank webhook the site cannot honestly confirm a transfer. Public donation-alert events will only be added with a payment provider that signs confirmations."}</p></div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
