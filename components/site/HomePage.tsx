"use client";

import { ArrowDown, ArrowUpRight, ScanLine } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { FacilityScene } from "@/components/site/FacilityScene";
import { HonestFooter } from "@/components/site/HonestFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { TelemetryWall } from "@/components/site/TelemetryWall";
import { ChatLaunch } from "@/components/site/ChatLaunch";
import { WorkspaceCapabilities } from "@/components/site/WorkspaceCapabilities";
import Hero from "@/components/ui/hero";

export function HomePage() {
  const { copy } = useLanguage();

  return (
    <main className="brand-site">
      <SiteNav />
      <Hero />
      <WorkspaceCapabilities />

      <section className="facility-section site-section" id="facility">
        <div className="section-heading page-grid">
          <div>
            <span className="eyebrow text-[#e7ff49]">{copy.home.facilityEyebrow}</span>
            <h2>{copy.home.facilityTitleLead}<br /><em>{copy.home.facilityTitleAccent}</em></h2>
          </div>
          <div className="section-heading-copy">
            <p>{copy.home.facilityCopy}</p>
            <div className="section-note"><ScanLine size={15} /> {copy.home.facilityNote}</div>
          </div>
        </div>
        <FacilityScene />
        <div className="facility-scroll-note"><ArrowDown size={14} aria-hidden="true" /> {copy.home.facilityScroll}</div>
      </section>

      <section className="telemetry-section site-section" id="telemetry"><TelemetryWall /></section>

      <section className="proof-section site-section" id="proof"><ChatLaunch /></section>

      <section className="reveal-section site-section" id="reveal">
        <div className="reveal-mark" aria-hidden="true">{copy.home.revealMark}</div>
        <div className="reveal-copy page-grid">
          <div>
            <span className="eyebrow text-[#e7ff49]">{copy.home.revealEyebrow}</span>
            <h2>{copy.home.revealTitleLead}<br /><em>{copy.home.revealTitleAccent}</em></h2>
          </div>
          <div className="reveal-copy-body">
            <p>{copy.home.revealCopy}</p>
            <a className="text-link" href="/truth">{copy.home.revealLink} <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <HonestFooter />
    </main>
  );
}
