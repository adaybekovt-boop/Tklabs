"use client";

import Link from "next/link";
import { useRef } from "react";
import { homeCopy } from "./home-copy";
import { TaskWorkspace } from "./TaskWorkspace";
import { useHomeFilm } from "./motion/useHomeFilm";
import type { Locale } from "@/lib/i18n";

export function ErmaHomeExperience({ locale, selectedModelKey }: { locale: Locale; selectedModelKey: string }) {
  const root = useRef<HTMLDivElement>(null);
  const copy = homeCopy(locale);
  useHomeFilm(root, locale);

  return <div className="home-film" ref={root} data-home-film>
    <div className="home-film-stage">
      <div className="home-hero" data-film-hero>
        <p className="home-intro">{copy.intro}</p>
        <h1>{copy.hero.map(line => <span key={line}>{line}{" "}</span>)}</h1>
        <div className="home-hero-bottom"><p>{copy.description}</p><Link className="home-cta" href="/playground">{copy.open}<span aria-hidden="true">↗</span></Link></div>
        <a className="home-follow" href="#task-story">{copy.follow}<span aria-hidden="true">↘</span></a>
      </div>
      <div className="film-captions" id="task-story">{copy.stages.map((stage, index) => index === 2 ? null : <section className="film-caption" key={stage.label} data-film-caption={index}><h2>{stage.title}</h2><p>{stage.text}</p></section>)}</div>
      <TaskWorkspace copy={copy} selectedModelKey={selectedModelKey}/>
      <div className="film-footer"><div className="film-chapters" aria-hidden="true">{copy.stages.map((stage, index) => <span key={stage.label} data-film-chapter={index}>{stage.label}</span>)}</div><a href="#versions">{copy.skipFilm}<span aria-hidden="true">↗</span></a></div>
      <div className="film-progress" aria-hidden="true"><span data-film-progress/></div>
    </div>
  </div>;
}
