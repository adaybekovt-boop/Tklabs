import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MembershipCard } from "@/components/profile/MembershipCard";
import { ProfileLocalData } from "@/components/profile/ProfileLocalData";
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
        cardHelp: "Карта реагирует на указатель и переворачивается нажатием. На телефоне касание не блокирует вертикальную прокрутку.",
        foundersEdition: "Platinum Founders Edition",
        memberEdition: "Gold Member Edition",
        founderDuo: "Основатели · TK × Thomas",
        included: "Доступ и возможности",
        flipCard: "Перевернуть карту",
        flipHint: "Нажмите, чтобы перевернуть",
        overview: "Состояние аккаунта",
        role: "Роль",
        details: "Подробные параметры",
        membershipNote: isAdmin
          ? "Platinum выдаётся только сервером для администраторских аккаунтов. Оба основателя получают одинаковую Founders Edition."
          : "Gold — стандартная карта участника. Цвет карты не изменяет права доступа.",
      }
    : {
        intro: "The account overview revolves around a personal membership card. Tilt it with the pointer and press it to reveal the reverse side.",
        openChat: "Open AI chat",
        releaseNotes: "Release history",
        cardHelp: "The card reacts to pointer movement and flips on press. Touch interaction does not block vertical scrolling.",
        foundersEdition: "Platinum Founders Edition",
        memberEdition: "Gold Member Edition",
        founderDuo: "Founders · TK × Thomas",
        included: "Access and capabilities",
        flipCard: "Flip membership card",
        flipHint: "Press to flip",
        overview: "Account overview",
        role: "Role",
        details: "Detailed parameters",
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
      <style>{`
        .membership-card { touch-action: pan-y; }
        @media (max-width: 380px) {
          .membership-card button { min-height: 260px; }
        }
      `}</style>
      <main className="stitch-container min-h-screen pb-section-gap pt-8 sm:pt-12">
        <section className="mb-12 grid items-start gap-8 border-b-[0.5px] border-primary pb-12 md:mb-16 md:grid-cols-12 md:gap-8 md:pb-16">
          <ScrollReveal className="md:col-span-4">
            <p className="label-caps mb-5 text-secondary md:mb-7">{text.profile.eyebrow}</p>
            <h1 className="display-title">{displayName}</h1>
            <p className="mt-4 break-all text-[15px] text-on-surface-variant sm:mt-5 sm:text-[18px]">{session?.user?.email ?? text.profile.localEmail}</p>
            <p className="mt-6 max-w-md leading-[1.7] text-on-surface-variant sm:mt-8 sm:leading-[1.75]">{ui.intro}</p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/playground" className="quiet-button quiet-button--dark gap-2 px-3">{ui.openChat}<ArrowUpRight size={15} /></Link>
              <Link href="/patch-notes" className="quiet-button gap-2 px-3">{ui.releaseNotes}<ArrowUpRight size={15} /></Link>
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
            <div className="mb-6 border-b-[0.5px] border-primary pb-5 sm:mb-7 sm:flex sm:items-end sm:justify-between sm:gap-5 sm:pb-6">
              <div>
                <p className="label-caps text-secondary">{ui.overview}</p>
                <h2 id="profile-overview-title" className="headline-title mt-3">{text.profile.parameters}</h2>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-[1.6] text-on-surface-variant sm:mt-0">{ui.membershipNote}</p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {overviewCards.map(([label, value], index) => (
              <ScrollReveal key={label} delay={index * 0.05}>
                <article className="h-full rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 transition-transform duration-200 hover:-translate-y-1 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary sm:text-[12px] sm:tracking-[0.1em]">{label}</p>
                  <p className="mt-3 text-sm font-medium text-primary sm:mt-4 sm:text-base">{value}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="hidden gap-12 md:grid md:grid-cols-12" aria-label={ui.details}>
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
              <div key={item} className="flex items-center justify-between gap-6 border-b-[0.5px] border-primary/25 py-6">
                <span>{item}</span>
                <span className="label-caps max-w-full break-words text-right text-secondary">{value}</span>
              </div>
            ))}
          </ScrollReveal>
        </section>

        <ProfileLocalData locale={locale} />

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
