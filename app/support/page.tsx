import type { Metadata } from "next";

import { SupportPanel } from "@/components/support/SupportPanel";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Support TK LAB",
  description: "Voluntary support for the independent TK LAB open-source project through DonationAlerts.",
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
            {ru ? "TK LAB остаётся бесплатным open-source проектом. Поддержка не является покупкой, подпиской или оплатой дополнительных AI-функций. Основной перевод проходит через DonationAlerts вне платёжного контура TK LAB." : "TK LAB remains a free open-source project. Support is not a purchase, subscription, or payment for additional AI features. The primary transfer flow runs through DonationAlerts outside TK LAB's payment boundary."}
          </p>
        </section>
        <SupportPanel locale={locale} />
        <section className="mt-8 grid gap-4 border-t border-outline-variant/30 pt-8 md:grid-cols-3">
          <div><p className="text-sm font-semibold text-primary">{ru ? "Что хранит TK LAB" : "What TK LAB stores"}</p><p className="mt-2 text-sm leading-6 text-on-surface-variant">{ru ? "Страница поддержки не создаёт профиль донора и не сохраняет введённые имя, сообщение или сумму. Эти поля — локальный предпросмотр." : "The support page creates no donor profile and does not persist the entered name, message, or amount. Those fields are a local-only preview."}</p></div>
          <div><p className="text-sm font-semibold text-primary">{ru ? "Кто обрабатывает платёж" : "Who processes payment"}</p><p className="mt-2 text-sm leading-6 text-on-surface-variant">{ru ? "DonationAlerts открывается как отдельный сервис и обрабатывает платёж по своим правилам. TK LAB не получает номер карты, CVV, банковский логин или историю операции." : "DonationAlerts opens as a separate service and processes payment under its own rules. TK LAB receives no card number, CVV, banking credentials, or transaction history."}</p></div>
          <div><p className="text-sm font-semibold text-primary">{ru ? "Как подтверждается донат" : "How donations are confirmed"}</p><p className="mt-2 text-sm leading-6 text-on-surface-variant">{ru ? "Подтверждение и donation-alert механика остаются на стороне DonationAlerts. TK LAB не подделывает статус «Оплачено» и не считает перевод совершённым без проверяемого события провайдера." : "Confirmation and donation-alert mechanics remain on DonationAlerts. TK LAB never fabricates a “Paid” state or treats a transfer as completed without a verifiable provider event."}</p></div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
