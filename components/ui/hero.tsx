"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Languages, Mic2, ShieldCheck, Zap } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { cn } from "@/lib/utils";

export type HeroProps = { className?: string };

export function Hero({ className }: HeroProps) {
  const { copy } = useLanguage();

  const features = [
    { key: "language", icon: Languages, label: copy.hero.featureLanguage },
    { key: "voice", icon: Mic2, label: copy.hero.featureVoice },
    { key: "speed", icon: Zap, label: copy.hero.featureSpeed },
    { key: "safety", icon: ShieldCheck, label: copy.hero.featureSafety },
  ];

  return (
    <section id="home" className={cn("hero-shell", className)}>
      {/* Procedural facility surface: a survey grid over the base colour.
          No photograph, no external asset, nothing to license or 404. */}
      <div className="hero-surface" aria-hidden="true">
        <div className="hero-grid-fine" />
        <div className="hero-grid-coarse" />
        <div className="hero-horizon" />
      </div>

      <div className="hero-body">
        <div className="hero-main">
          <p className="eyebrow hero-eyebrow">{copy.hero.eyebrow}</p>

          <h1 className="hero-title">
            {copy.hero.titleLead}
            <br />
            <span className="hero-title-accent">{copy.hero.titleAccent}</span> {copy.hero.titleEnd}
          </h1>

          <div className="hero-actions">
            <Link className="hero-cta" href="/ai-chats">
              {copy.hero.action}
              <span className="hero-cta-glyph">
                <ArrowRight aria-hidden="true" size={18} />
              </span>
            </Link>
            <a className="hero-secondary" href="#capabilities">{copy.hero.howItWorks}</a>
          </div>
          <p className="hero-action-note">{copy.hero.note}</p>
        </div>

        <div className="hero-aside">
          <div className="hero-erma-card">
            <div className="hero-erma-card-topline">
              <span>ERMA LITE</span>
              <span className="hero-status"><span className="status-dot" /> {copy.hero.statusReady}</span>
            </div>
            <div className="hero-erma-portrait">
              <Image src="/erma-model.png" alt="Erma AI" width={368} height={418} unoptimized priority />
            </div>
            <div className="hero-erma-card-meta">
              <span>{copy.hero.modeLabel}</span>
              <strong>{copy.hero.modeValue}</strong>
            </div>
          </div>
          <p className="hero-quote">{copy.hero.quote}</p>
          <ul className="hero-feature-list" aria-label={copy.hero.metrics}>
            {features.map(({ key, icon: Icon, label }) => (
              <li key={key}><Icon size={14} aria-hidden="true" /><span>{label}</span><CheckCircle2 size={13} aria-hidden="true" /></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="hero-footer">
        <a className="hero-scroll" href="#capabilities"><span className="status-dot" aria-hidden="true" /> {copy.hero.scroll}</a>
      </div>
    </section>
  );
}

export const Component = Hero;
export default Hero;
