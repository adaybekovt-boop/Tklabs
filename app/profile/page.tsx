import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  ArrowUpRight,
  Bot,
  Cpu,
  DatabaseBackup,
  HardDrive,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { auth } from "@/auth";
import { MembershipCard } from "@/components/profile/MembershipCard";
import { MobileProfileSummary } from "@/components/profile/MobileProfileSummary";
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
import { CURRENT_RELEASE_VERSION } from "@/lib/release-version";

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
        intro: "Профиль теперь работает как понятный центр аккаунта: статус доступа, карта участника, локальные данные и основные действия собраны в одной последовательной структуре.",
        openChat: "Открыть AI-чат",
        releases: "История обновлений",
        vault: "Workspace Vault",
        localData: "Данные на устройстве",
        openChatHint: "Продолжить работу с Erma и диалогами",
        releasesHint: "Посмотреть текущий релиз и историю изменений",
        vaultHint: "Создать полный локальный бэкап рабочего пространства",
        localDataHint: "Управлять историей, черновиками и настройками чата",
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
        account: "Аккаунт",
        membership: "Карта участника",
        navigation: "Разделы профиля",
        currentRelease: "Релиз",
        profileStatus: "Статус",
        accessOverview: "Доступ и лимиты",
        membershipNote: isAdmin
          ? "Platinum выдаётся только сервером для администраторских аккаунтов. Оба основателя получают одинаковую Founders Edition."
          : "Gold — стандартная карта участника. Цвет карты не изменяет права доступа.",
        aiDetail: unlimited ? "Без дневного ограничения для разрешённого аккаунта" : "Стандартный дневной лимит запросов",
        clodexDetail: "Состояние серверной интеграции Clodex",
        roleDetail: "Назначается только серверной политикой доступа",
        archiveDetail: "История хранится локально в текущем браузере",
      }
    : {
        intro: "The profile now works as a clear account hub: access status, membership card, local data, and primary actions follow one consistent hierarchy.",
        openChat: "Open AI chat",
        releases: "Release history",
        vault: "Workspace Vault",
        localData: "On-device data",
        openChatHint: "Continue working with Erma and conversations",
        releasesHint: "Review the current release and change history",
        vaultHint: "Create a complete local workspace backup",
        localDataHint: "Manage chat history, drafts, and preferences",
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
        account: "Account",
        membership: "Membership card",
        navigation: "Profile sections",
        currentRelease: "Release",
        profileStatus: "Status",
        accessOverview: "Access and limits",
        membershipNote: isAdmin
          ? "Platinum is assigned server-side to administrator accounts. Both founders receive the same Founders Edition."
          : "Gold is the standard member card. Card color never changes authorization.",
        aiDetail: unlimited ? "No daily limit for the allowlisted account" : "Standard daily request allowance",
        clodexDetail: "Current state of the server-side Clodex integration",
        roleDetail: "Assigned only through the server access policy",
        archiveDetail: "Conversation history remains in this browser",
      };

  const actions = [
    { href: "/playground", label: ui.openChat, hint: ui.openChatHint, icon: Bot },
    { href: "/vault", label: ui.vault, hint: ui.vaultHint, icon: DatabaseBackup },
    { href: "/patch-notes", label: ui.releases, hint: ui.releasesHint, icon: ScrollText },
    { href: "#local-data", label: ui.localData, hint: ui.localDataHint, icon: HardDrive },
  ];
  const overviewCards = [
    { label: text.profile.membership.aiAccess, value: unlimited ? text.profile.membership.unlimited : text.profile.membership.standard, detail: ui.aiDetail, icon: Bot },
    { label: text.profile.membership.clodex, value: clodexLabel, detail: ui.clodexDetail, icon: Cpu },
    { label: ui.role, value: isAdmin ? text.profile.membership.administrator : text.profile.membership.member, detail: ui.roleDetail, icon: ShieldCheck },
    { label: text.profile.archive, value: text.profile.archiveValue, detail: ui.archiveDetail, icon: Archive },
  ];

  return (
    <>
      <StitchHeader />
      <style>{`.membership-card { touch-action: pan-y; }`}</style>
      <main className="stitch-container min-h-screen pb-section-gap pt-5 sm:pt-10">
        <MobileProfileSummary
          displayName={displayName}
          email={email || text.profile.localEmail}
          avatarSrc={profileImage}
          initials={profileInitials}
          isAdmin={isAdmin}
          unlimitedAi={unlimited}
          clodexLabel={clodexLabel}
          archiveLabel={text.profile.archiveValue}
          releaseVersion={CURRENT_RELEASE_VERSION}
          labels={{
            account: ui.account,
            administrator: text.profile.membership.administrator,
            member: text.profile.membership.member,
            aiAccess: text.profile.membership.aiAccess,
            unlimited: text.profile.membership.unlimited,
            standard: text.profile.membership.standard,
            clodex: text.profile.membership.clodex,
            archive: text.profile.archive,
            openChat: ui.openChat,
            releases: ui.releases,
            localData: ui.localData,
            vault: ui.vault,
            currentRelease: ui.currentRelease,
            profileStatus: ui.profileStatus,
            openChatHint: ui.openChatHint,
            releasesHint: ui.releasesHint,
            localDataHint: ui.localDataHint,
            vaultHint: ui.vaultHint,
          }}
        />

        <nav className="sticky top-[80px] z-30 mb-8 hidden items-center gap-1 overflow-x-auto rounded-full border border-outline-variant bg-surface/95 p-1.5 backdrop-blur-xl md:flex" aria-label={ui.navigation} data-profile-section-nav>
          {[
            ["#membership", ui.membership],
            ["#overview", ui.overview],
            ["#account-details", ui.accessOverview],
            ["#local-data", ui.localData],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-primary hover:text-on-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              {label}
            </Link>
          ))}
        </nav>

        <section id="membership" className="scroll-mt-32 border-b border-outline-variant pb-10 md:grid md:grid-cols-12 md:items-start md:gap-8 md:pb-16" aria-labelledby="profile-membership-title">
          <ScrollReveal className="hidden md:col-span-4 md:block">
            <article className="relative overflow-hidden rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_24px_70px_rgba(15,23,42,.08)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_15%_10%,rgba(123,97,255,.2),transparent_45%),radial-gradient(circle_at_90%_0%,rgba(59,130,246,.16),transparent_38%)]" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="relative grid size-20 place-items-center overflow-hidden rounded-[1.65rem] border border-white/60 bg-surface-container-low text-xl font-semibold text-primary shadow-[0_14px_35px_rgba(15,23,42,.16)]">
                    {profileImage ? <Image src={profileImage} alt="" fill sizes="80px" unoptimized className="object-cover" /> : <span aria-hidden="true">{profileInitials}</span>}
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
                    <ShieldCheck size={13} aria-hidden="true" /> {isAdmin ? text.profile.membership.administrator : text.profile.membership.member}
                  </span>
                </div>
                <p className="label-caps mt-7 text-secondary">{text.profile.eyebrow}</p>
                <h1 id="profile-membership-title" className="display-title mt-3">{displayName}</h1>
                <p className="mt-3 break-all text-sm text-on-surface-variant">{session?.user?.email ?? text.profile.localEmail}</p>
                <p className="mt-6 leading-[1.7] text-on-surface-variant">{ui.intro}</p>
                <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-outline-variant bg-surface/75 px-4 py-3">
                  <span className="text-xs text-on-surface-variant">{ui.currentRelease}</span>
                  <span className="text-xs font-semibold text-primary">{CURRENT_RELEASE_VERSION}</span>
                </div>
                <div className="mt-4 grid gap-2" data-profile-desktop-actions>
                  {actions.map(({ href, label, hint, icon: Icon }) => (
                    <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface px-4 py-3 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-container-low text-primary"><Icon size={17} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-primary">{label}</span><span className="mt-0.5 block text-[11px] leading-[1.4] text-on-surface-variant">{hint}</span></span>
                      <ArrowUpRight size={15} aria-hidden="true" className="shrink-0 text-secondary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          </ScrollReveal>

          <ScrollReveal delay={0.08} className="md:col-span-7 md:col-start-6">
            <div className="mb-4 flex items-end justify-between gap-4 md:hidden">
              <div><p className="label-caps text-secondary">{ui.membership}</p><h2 className="mt-2 font-serif text-3xl text-primary">{isAdmin ? ui.foundersEdition : ui.memberEdition}</h2></div>
              <span className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">{CURRENT_RELEASE_VERSION}</span>
            </div>
            <MembershipCard
              isAdmin={isAdmin}
              displayName={displayName}
              email={email || text.profile.localEmail}
              avatarSrc={profileImage}
              initials={profileInitials}
              unlimitedAi={unlimited}
              clodexState={access.clodexState}
              labels={{ ...text.profile.membership, foundersEdition: ui.foundersEdition, memberEdition: ui.memberEdition, founderDuo: ui.founderDuo, included: ui.included, flipCard: ui.flipCard, flipHint: ui.flipHint }}
            />
            <p className="mx-auto mt-4 max-w-[720px] text-center text-xs leading-[1.6] text-secondary">{ui.cardHelp}</p>
          </ScrollReveal>
        </section>

        <section id="overview" className="scroll-mt-32 py-10 md:py-16" aria-labelledby="profile-overview-title">
          <ScrollReveal>
            <div className="mb-6 border-b border-outline-variant pb-5 sm:flex sm:items-end sm:justify-between sm:gap-5 sm:pb-6">
              <div><p className="label-caps text-secondary">{ui.overview}</p><h2 id="profile-overview-title" className="headline-title mt-3">{text.profile.parameters}</h2></div>
              <p className="mt-4 max-w-xl text-sm leading-[1.6] text-on-surface-variant sm:mt-0">{ui.membershipNote}</p>
            </div>
          </ScrollReveal>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map(({ label, value, detail, icon: Icon }, index) => (
              <ScrollReveal key={label} delay={index * 0.05}>
                <article className="h-full rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_18px_45px_rgba(15,23,42,.08)]">
                  <span className="grid size-10 place-items-center rounded-2xl bg-surface-container-low text-primary"><Icon size={18} aria-hidden="true" /></span>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">{label}</p>
                  <p className="mt-2 text-base font-semibold text-primary">{value}</p>
                  <p className="mt-3 text-xs leading-[1.55] text-on-surface-variant">{detail}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section id="account-details" className="scroll-mt-32 grid gap-8 border-t border-outline-variant pt-10 md:grid-cols-12 md:gap-12" aria-label={ui.details}>
          <ScrollReveal className="md:col-span-4">
            <div className="relative overflow-hidden rounded-[2rem] border border-outline-variant bg-[linear-gradient(145deg,rgba(123,97,255,.12),rgba(59,130,246,.05),transparent)] p-6">
              <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full border border-primary/10" />
              <span className="grid size-11 place-items-center rounded-2xl border border-outline-variant bg-surface-container-lowest"><Sparkles size={19} aria-hidden="true" /></span>
              <h2 className="headline-title mt-6">{text.profile.accessLevel}</h2>
              <p className="mt-5 leading-[1.7] text-on-surface-variant">{text.profile.description}</p>
              <p className="mt-7 font-serif text-[28px] text-primary">{isAdmin ? text.profile.adminAccess : unlimited ? text.profile.unlimitedModelsValue : text.profile.standardAccess}</p>
              <p className="label-caps mt-2 text-secondary">{isAdmin ? text.profile.adminState : text.profile.active}</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.08} className="md:col-span-7 md:col-start-6">
            <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
              {[
                [text.profile.availableModels, unlimited ? text.profile.unlimitedModelsValue : text.profile.modelsValue],
                [text.profile.dailyLimit, unlimited ? text.profile.unlimitedDailyValue : text.profile.dailyValue],
                [text.profile.archive, text.profile.archiveValue],
                [text.profile.clodex, clodexLabel],
              ].map(([item, value]) => (
                <div key={item} className="flex min-h-16 items-center justify-between gap-6 border-b border-outline-variant px-4 py-4 last:border-b-0 sm:px-5">
                  <span className="text-sm text-on-surface-variant">{item}</span>
                  <span className="max-w-[55%] break-words text-right text-xs font-semibold uppercase tracking-[0.08em] text-primary">{value}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <ProfileLocalData locale={locale} />

        {(promoEligible || isAdmin) && (
          <section className="mt-section-gap grid gap-8 border-t border-outline-variant pt-10 md:grid-cols-12">
            <div className="md:col-span-4"><p className="label-caps text-secondary">{text.profile.adminToolsLabel}</p><h2 className="headline-title mt-4">{text.profile.adminToolsTitle}</h2></div>
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
