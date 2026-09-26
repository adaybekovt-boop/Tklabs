import type { Metadata } from "next";
import "@/app/home.css";
import { ErmaHomeExperience } from "@/components/home/ErmaHomeExperience";
import { HomeEnding, HomeQuiet } from "@/components/home/HomeEnding";
import { VersionWorkbench } from "@/components/home/VersionWorkbench";
import { homeCopy } from "@/components/home/home-copy";
import { StitchHeader } from "@/components/site/StitchHeader";
import { StitchFooter } from "@/components/site/StitchFooter";
import { getCurrentRelease } from "@/lib/current-release";
import { getLocale } from "@/lib/locale";
import { selectErmaModel } from "@/lib/models/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "Erma — TK Labs",
    description: locale === "ru"
      ? "AI-среда для работы с продолжением. Автоматический выбор режима, видимые инструменты, проекты и версии файлов."
      : "An AI workspace for work that continues. Automatic mode selection, visible tools, projects, and file versions.",
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const copy = homeCopy(locale);
  const release = getCurrentRelease(locale);
  const selectedModelKey = selectErmaModel(undefined, copy.prompt).key;
  return <div className="erma-home-shell" lang={locale}>
    <a className="home-skip" href="#home-main">{copy.skip}</a>
    <StitchHeader active="home" />
    <main id="home-main" data-home-motion tabIndex={-1}>
      <ErmaHomeExperience locale={locale} selectedModelKey={selectedModelKey}/>
      <HomeQuiet locale={locale}/>
      <VersionWorkbench locale={locale}/>
      <HomeEnding locale={locale} release={release}/>
    </main>
    <StitchFooter/>
  </div>;
}
