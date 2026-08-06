import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MembershipCard } from "@/components/profile/MembershipCard";
import { PromoCodePanel } from "@/components/profile/PromoCodePanel";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { isClodexEnabled } from "@/lib/feature-flags";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { isClodexPromoEligible } from "@/lib/privileged-access";
import { getProfileAccess } from "@/lib/profile-access";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user && process.env.NODE_ENV !== "development") redirect("/login");

  const locale = await getLocale();
  const text = getDictionary(locale);
  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  const access = await getProfileAccess(email);
  const unlimited = access.unlimitedAi;
  const isAdmin = access.isAdmin;
  const promoEligible = isClodexEnabled() && isClodexPromoEligible(email);
  const clodexLabel = access.clodexState === "active"
    ? text.profile.membership.active
    : access.clodexState === "disabled"
      ? text.profile.membership.disabled
      : access.clodexState === "unavailable"
        ? text.profile.membership.unavailable
        : text.profile.membership.inactive;
  const profileImage = session?.user?.image?.trim();
  const displayName = session?.user?.name ?? text.profile.fallbackName;
  const profileInitials = (session?.user?.name ?? session?.user?.email ?? "TK")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TK";

  const ui = locale === "ru"
    ? {
        intro: "Главная информация аккаунта собрана вокруг персональной карты. Поверните её указателем и нажмите, чтобы открыть обратную сторону.",
        openChat: "Открыть AI-чат",
        releaseNotes: "История обновлений",
        cardHelp: "Карта интерактивна: движение указателя меняет свет и наклон, нажатие переворачивает её. На телефоне используется нажатие без блокировки прокрутки.",
        foundersEdition: "Platinum Founders Edition",
        memberEdition: "Gold Member Edition",
        founderDuo: "Основатели · TK × Thomas",
        included: "Доступ и возможности",
        flipCard: "Перевернуть карту",
        flipHint: "Нажмите, чтобы перевернуть",
        overview: "Состояние аккаунта",
        role: "Роль",
        membershipNote: isAdmin
          ? "Platinum выдаётся только сервером для администраторских аккаунтов. Оба основателя получают одинаковую Founders Edition."
          : "Gold — стандартная карта участника. Цвет карты не изменяет права доступа.",
      }
    : {
        intro: "The account overview now revolves around a personal membership card. Tilt it with the pointer and press it to reveal the reverse side.",
        openChat: "Open AI chat",
        releaseNotes: "Release history",
        cardHelp: "The card reacts to pointer movement and flips on press. Touch devices use tap interaction without blocking page scrolling.",
        foundersEdition: "Platinum Founders Edition",
        memberEdition: "Gold Member Edition",
        founderDuo: "Founders · TK × Thomas",
        included: "Access and capabilities",
        flipCard: "Flip membership card",
        flipHint: "Press to flip",
        overview: "Account overview",
        role: "Role",
        membershipNote: isAdmin
          ? "Platinum is assigned server-side to administrator accounts. Both founders receive the same Founders Edition."
          : "Gold is the standard member card. Card color never changes authorization.",
      };

  const overviewCards = [
    [text.profile.membership.aiAccess, unlimited ? text.profile.membership.unlimited : text.profile.membership.standard],
    [text.profile.membership.clodex, clodexLabel],
    [ui.role, isAdmin ? text.profile.membership.administrator : text.profile.membership.member],
    [text.profile.archive, text.profile.archiveValue],
  ];

  return (
    <>
      <StitchHeader />
      <main className="stitch-container min-h-screen pb-section-gap pt-12">
        <section className="mb-16 grid items-start gap-10 border-b-[0.5px] border-primary pb-16 md:grid-cols-12 md:gap-8">
          <ScrollReveal className="md:col-span-4">
            <p className="label-caps mb-7 text-secondary">{text.profile.eyebrow}</p>
            <h1 className="display-title">{displayName}</h1>
            <p className="mt-5 break-all text-[16px] text-on-surface-variant sm:text-[18px]">{session?.user?.email ?? text.profile.localEmail}</p>
            <p className="mt-8 max-w-md leading-[1.75] text-on-surface-variant">{ui.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/playground" className="quiet-button quiet-button--dark gap-2">{ui.openChat}<ArrowUpRight size={15} /></Link>
              <Link href="/patch-notes" className="quiet-button gap-2">{ui.releaseNotes}<ArrowUpRight size={15} /></Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.12} className="md:col-span-7 md:col-start-6">
            <MembershipCard
              isAdmin={isAdmin}
              displayName={displayName}
              email={email || text.profile.localEmail}
              avatarSrc={profileImage}
              initials={profileInitials}
              unlimitedAi={unlimited}
              clodexState={access.clodexState}
              labels={{
                ...text.profile.membership,
                foundersEdition: ui.foundersEdition,
                memberEdition: ui.memberEdition,
                founderDuo: ui.founderDuo,
                included: ui.included,
                flipCard: ui.flipCard,
                flipHint: ui.flipHint,
              }}
            />
            <p className="mx-auto mt-4 max-w-[720px] text-center text-xs leading-[1.6] text-secondary">{ui.cardHelp}</p>
          </ScrollReveal>
        </section>

        <section className="mb-section-gap" aria-labelledby="profile-overview-title">
          <ScrollReveal>
            <div className="mb-7 flex flex-col gap-3 border-b-[0.5px] border-primary pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="label-caps text-secondary">{ui.overview}</p>
                <h2 id="profile-overview-title" className="headline-title mt-3">{text.profile.parameters}</h2>
              </div>
              <p className="max-w-xl text-sm leading-[1.6] text-on-surface-variant">{ui.membershipNote}</p>
            </div>
          </ScrollReveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map(([label, value], index) => (
              <ScrollReveal key={label} delay={index * 0.05}>
                <article className="h-full rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 transition-transform duration-200 hover:-translate-y-1">
                  <p className="label-caps text-secondary">{label}</p>
                  <p className="mt-4 text-base font-medium text-primary">{value}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="grid gap-12 md:grid-cols-12">
          <ScrollReveal className="md:col-span-4">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low">
              <Sparkles size={19} aria-hidden="true" />
            </div>
            <h2 className="headline-title mt-6">{text.profile.accessLevel}</h2>
            <p className="mt-5 leading-[1.7] text-on-surface-variant">{text.profile.description}</p>
            <p className="mt-6 font-serif text-[24px]">
              {isAdmin ? text.profile.adminAccess : unlimited ? text.profile.unlimitedModelsValue : text.profile.standardAccess}
            </p>
            <p className="label-caps mt-2 text-secondary">{isAdmin ? text.profile.adminState : text.profile.active}</p>
          </ScrollReveal>

          <ScrollReveal delay={0.12} className="border-t-[0.5px] border-primary md:col-span-7 md:col-start-6">
            {[
              [text.profile.availableModels, unlimited ? text.profile.unlimitedModelsValue : text.profile.modelsValue],
              [text.profile.dailyLimit, unlimited ? text.profile.unlimitedDailyValue : text.profile.dailyValue],
              [text.profile.archive, text.profile.archiveValue],
              [text.profile.clodex, clodexLabel],
            ].map(([item, value]) => (
              <div key={item} className="flex flex-col items-start gap-2 border-b-[0.5px] border-primary/25 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span>{item}</span>
                <span className="label-caps max-w-full break-words text-secondary sm:text-right">{value}</span>
              </div>
            ))}
          </ScrollReveal>
        </section>

        {(promoEligible || isAdmin) && (
          <section className="mt-section-gap grid gap-8 border-t-[0.5px] border-primary pt-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="label-caps text-secondary">{text.profile.adminToolsLabel}</p>
              <h2 className="headline-title mt-4">{text.profile.adminToolsTitle}</h2>
            </div>
            <div className="space-y-5 md:col-span-7 md:col-start-6">
              {promoEligible && <PromoCodePanel labels={text.profile.promo} />}
              {isAdmin && <Link href="/admin/terms" className="label-caps inline-flex border-b border-primary pb-2 text-primary">{text.profile.reviewAgreement} ↗</Link>}
            </div>
          </section>
        )}
      </main>
      <StitchFooter />
    </>
  );
}
