import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { StitchFooter } from "@/components/site/StitchFooter";
import { StitchHeader } from "@/components/site/StitchHeader";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const PROFILE_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuCWJNH6gaRimySA18W0082K9sOfWkIKN6NwipZpJiJZVy_j7XjCrXXqac5gAJdHn-tZmEkXoatlJww2v3Kw_QfK9xG7g2cT_RZStoyHpo_kbkKRXzbO3p5EO8Y82-_yUuL2LyARX8m_WsnFFe8RxUqWpoo0I4SQ-Qmdujy2jLdU7r92SVNMO19tPJjPnCW2Xfe6Mntaqyr-tVY7ssWBgg7hi4zzOuRZSJk_6Lxc_JXa8abdgeYcUfVI";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user && process.env.NODE_ENV !== "development") redirect("/login");

  const text = getDictionary(await getLocale());

  return (
    <>
      <StitchHeader />
      <main className="stitch-container min-h-screen pb-section-gap pt-12">
        <section className="editorial-enter mb-section-gap grid gap-10 border-b-[0.5px] border-primary pb-16 md:grid-cols-12">
          <div className="relative aspect-[4/5] md:col-span-4">
            <img src={PROFILE_IMAGE} alt={text.profile.portraitAlt} className="h-full w-full object-cover grayscale" />
          </div>
          <div className="flex flex-col justify-between md:col-span-7 md:col-start-6">
            <div>
              <p className="label-caps mb-8 text-secondary">{text.profile.eyebrow}</p>
              <h1 className="display-title">{session?.user?.name ?? text.profile.fallbackName}</h1>
              <p className="mt-5 text-[18px] text-on-surface-variant">{session?.user?.email ?? text.profile.localEmail}</p>
            </div>
            <div className="mt-14 grid grid-cols-2 gap-px border border-primary bg-primary">
              <div className="bg-surface p-7"><span className="label-caps text-secondary">{text.profile.accessLevel}</span><p className="mt-5 font-serif text-[25px]">Erma / Standard</p></div>
              <div className="bg-surface p-7"><span className="label-caps text-secondary">{text.profile.state}</span><p className="mt-5 font-serif text-[25px]">{text.profile.active}</p></div>
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
              [text.profile.availableModels, text.profile.modelsValue],
              [text.profile.dailyLimit, text.profile.dailyValue],
              [text.profile.archive, text.profile.archiveValue],
              [text.profile.clodex, text.profile.clodexValue],
            ].map(([item, value]) => (
              <div key={item} className="flex items-center justify-between border-b-[0.5px] border-primary/25 py-7">
                <span>{item}</span><span className="label-caps text-secondary">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <StitchFooter />
    </>
  );
}