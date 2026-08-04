"use client";

import { ArrowDownRight } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HeroProps = { className?: string };

export function Hero({ className }: HeroProps) {
  const { copy } = useLanguage();

  /* A fixed readout, not a scrolling ticker. Real monitoring surfaces hold
     still so you can read them; the numbers are the point, not the movement. */
  const readout = [
    { key: "racks", label: copy.hero.statRacks, value: "4 096", tone: "hero-readout-lime" },
    { key: "uptime", label: copy.hero.statUptime, value: "99.97%", tone: "hero-readout-white" },
    { key: "cost", label: copy.hero.statCost, value: "$0.00019", tone: "hero-readout-orange" },
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
            <Button
              className="hero-cta"
              onClick={() => document.getElementById("proof")?.scrollIntoView({ behavior: "smooth" })}
            >
              {copy.hero.action}
              <span className="hero-cta-glyph">
                <ArrowDownRight aria-hidden="true" size={18} />
              </span>
            </Button>
            <span className="hero-action-note">{copy.hero.note}</span>
          </div>
        </div>

        <div className="hero-aside">
          <p className="hero-quote">{copy.hero.quote}</p>

          <dl className="hero-readout" aria-label={copy.hero.metrics}>
            {readout.map((item) => (
              <div className={cn("hero-readout-row", item.tone)} key={item.key}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="hero-footer">
        <span className="hero-scroll">
          <span className="status-dot" aria-hidden="true" /> {copy.hero.scroll}
        </span>
      </div>
    </section>
  );
}

export const Component = Hero;
export default Hero;
