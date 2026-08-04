import { redirect } from "next/navigation";
import Image from "next/image";

import { auth } from "@/auth";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { isPrivilegedAiEmail } from "@/lib/privileged-access";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user && process.env.NODE_ENV !== "development") redirect("/login");

  const text = getDictionary(await getLocale());
  const unlimited = isPrivilegedAiEmail(session?.user?.email);
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
        <section className="editorial-enter mb-section-gap grid gap-10 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <div className="relative grid aspect-square place-items-center overflow-hidden border border-outline-variant bg-surface-container-low md:col-span-4 md:aspect-[4/5]">
            {profileImage ? (
              <Image src={profileImage} alt={text.profile.portraitAlt} fill sizes="(min-width: 768px) 33vw, 100vw" unoptimized className="object-cover" />
            ) : (
              <span className="font-serif text-[clamp(72px,16vw,150px)] leading-none text-primary">{profileInitials}</span>
            )}
          </div>
          <div className="flex flex-col justify-between md:col-span-7 md:col-start-6">
            <div>
              <p className="label-caps mb-8 text-secondary">{text.profile.eyebrow}</p>
              <h1 className="display-title">{session?.user?.name ?? text.profile.fallbackName}</h1>
              <p className="mt-5 text-[18px] text-on-surface-variant">{session?.user?.email ?? text.profile.localEmail}</p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-px border border-primary bg-primary sm:grid-cols-2">
              <div className="bg-surface p-7"><span className="label-caps text-secondary">{text.profile.accessLevel}</span><p className="mt-5 font-serif text-[25px]">{unlimited ? text.profile.adminAccess : text.profile.standardAccess}</p></div>
              <div className="bg-surface p-7"><span className="label-caps text-secondary">{text.profile.state}</span><p className="mt-5 font-serif text-[25px]">{unlimited ? text.profile.adminState : text.profile.active}</p></div>
            </div>
          </div>
        </section>
        <section className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 className="headline-title">{text.profile.parameters}</h2>
            <p className="mt-5 leading-[1.7] text-on-surface-variant">{text.profile.description}</p>
          </div>
          <div className="border-t-[0.5px] border-primary md:col-span-7 md:col-start-6">
            {[
              [text.profile.availableModels, unlimited ? text.profile.unlimitedModelsValue : text.profile.modelsValue],
              [text.profile.dailyLimit, unlimited ? text.profile.unlimitedDailyValue : text.profile.dailyValue],
              [text.profile.archive, text.profile.archiveValue],
              [text.profile.clodex, unlimited ? text.profile.clodexUnlimitedValue : text.profile.clodexValue],
            ].map(([item, value]) => (
              <div key={item} className="flex flex-col items-start gap-2 border-b-[0.5px] border-primary/25 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <span>{item}</span><span className="label-caps max-w-full break-words text-secondary sm:text-right">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}
