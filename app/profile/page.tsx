import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { isClodexEnabled } from "@/lib/feature-flags";
import { isClodexPromoEligible } from "@/lib/privileged-access";
import { PromoCodePanel } from "@/components/profile/PromoCodePanel";
import { MembershipCard } from "@/components/profile/MembershipCard";
import { getProfileAccess } from "@/lib/profile-access";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user && process.env.NODE_ENV !== "development") redirect("/login");

  const text = getDictionary(await getLocale());
  const email = session?.user?.email?.trim().toLowerCase() ?? "";
  const access = await getProfileAccess(email);
  const unlimited = access.unlimitedAi;
  const isAdmin = access.isAdmin;
  const promoEligible = isClodexEnabled() && isClodexPromoEligible(email);
  const clodexLabel = access.clodexState === "active" ? text.profile.membership.active : access.clodexState === "disabled" ? text.profile.membership.disabled : access.clodexState === "unavailable" ? text.profile.membership.unavailable : text.profile.membership.inactive;
  const profileImage = session?.user?.image?.trim();
  const profileInitials = (session?.user?.name ?? session?.user?.email ?? "TK")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TK";

  return (
    <>
      <StitchHeader />
      <main className="stitch-container min-h-screen pb-section-gap pt-12">
        <section className="mb-section-gap grid gap-10 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <ScrollReveal className="relative grid aspect-square place-items-center overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-low md:col-span-4 md:aspect-[4/5]">
            {profileImage ? (
              <Image src={profileImage} alt={text.profile.portraitAlt} fill sizes="(min-width: 768px) 33vw, 100vw" unoptimized className="object-cover" />
            ) : (
              <span className="font-serif text-[clamp(72px,16vw,150px)] leading-none text-primary">{profileInitials}</span>
            )}
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="flex flex-col justify-between md:col-span-7 md:col-start-6">
            <div>
              <p className="label-caps mb-8 text-secondary">{text.profile.eyebrow}</p>
              <h1 className="display-title">{session?.user?.name ?? text.profile.fallbackName}</h1>
              <p className="mt-5 text-[18px] text-on-surface-variant">{session?.user?.email ?? text.profile.localEmail}</p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-primary bg-primary sm:grid-cols-2">
              <div className="bg-surface p-7"><span className="label-caps text-secondary">{text.profile.accessLevel}</span><p className="mt-5 font-serif text-[25px]">{isAdmin ? text.profile.adminAccess : unlimited ? text.profile.unlimitedModelsValue : text.profile.standardAccess}</p></div>
              <div className="bg-surface p-7"><span className="label-caps text-secondary">{text.profile.state}</span><p className="mt-5 font-serif text-[25px]">{isAdmin ? text.profile.adminState : text.profile.active}</p></div>
            </div>
          </ScrollReveal>
        </section>
        <section className="mb-section-gap grid gap-6 md:grid-cols-12">
          <div className="md:col-span-8 md:col-start-5">
            <MembershipCard isAdmin={isAdmin} displayName={session?.user?.name ?? text.profile.fallbackName} email={email || text.profile.localEmail} unlimitedAi={unlimited} clodexState={access.clodexState} labels={text.profile.membership} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:col-span-8 md:col-start-5 lg:grid-cols-4">
            {[
              [text.profile.membership.aiAccess, unlimited ? text.profile.membership.unlimited : text.profile.membership.standard],
              [text.profile.membership.clodex, clodexLabel],
              [text.profile.state, isAdmin ? text.profile.membership.administrator : text.profile.membership.member],
              [text.profile.archive, text.profile.archiveValue],
            ].map(([label, value]) => <div key={label} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4"><p className="label-caps text-secondary">{label}</p><p className="mt-3 text-sm font-medium text-primary">{value}</p></div>)}
          </div>
        </section>
        <section className="grid gap-12 md:grid-cols-12">
          <ScrollReveal className="md:col-span-4">
            <h2 className="headline-title">{text.profile.parameters}</h2>
            <p className="mt-5 leading-[1.7] text-on-surface-variant">{text.profile.description}</p>
          </ScrollReveal>
          <ScrollReveal delay={0.15} className="border-t-[0.5px] border-primary md:col-span-7 md:col-start-6">
            {[
              [text.profile.availableModels, unlimited ? text.profile.unlimitedModelsValue : text.profile.modelsValue],
              [text.profile.dailyLimit, unlimited ? text.profile.unlimitedDailyValue : text.profile.dailyValue],
              [text.profile.archive, text.profile.archiveValue],
              [text.profile.clodex, clodexLabel],
            ].map(([item, value]) => (
              <div key={item} className="flex flex-col items-start gap-2 border-b-[0.5px] border-primary/25 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span>{item}</span><span className="label-caps max-w-full break-words text-secondary sm:text-right">{value}</span>
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
