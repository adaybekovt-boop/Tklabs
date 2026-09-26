import Link from "next/link";
import { homeCopy } from "./home-copy";
import type { Locale } from "@/lib/i18n";
import type { getCurrentRelease } from "@/lib/current-release";

export function HomeEnding({ locale, release }: { locale: Locale; release: ReturnType<typeof getCurrentRelease> }) {
  const copy = homeCopy(locale);
  return <>
    <section className="home-release"><div><p>{copy.release}</p><Link href="/patch-notes" className="release-version">{release.version}<span aria-hidden="true">↗</span></Link><time>{release.date}</time></div><div><h2>{release.title}</h2><p>{release.summary}</p><Link href="/patch-notes" className="home-text-link">{copy.releaseLink}<span aria-hidden="true">↗</span></Link></div></section>
    <section className="home-ending"><p>{copy.end}</p><div className="ending-mark" aria-label="Erma"><span aria-hidden="true">E</span><span aria-hidden="true">R</span><span aria-hidden="true">M</span><span aria-hidden="true">A</span><svg viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 1H150V30H850V1H1000" fill="none"/></svg></div><div className="ending-action"><span>TK LABS / ERMA</span><div><Link className="home-cta" href="/playground">{copy.open}<span aria-hidden="true">↗</span></Link><p>{copy.endNote}</p></div></div></section>
  </>;
}

export function HomeQuiet({ locale }: { locale: Locale }) {
  const copy = homeCopy(locale);
  return <section className="home-quiet" aria-label={copy.quietText}><p>{copy.quietText}</p><div>{copy.quiet.map(word => <span key={word}>{word}</span>)}</div><span className="quiet-route" aria-hidden="true"/></section>;
}
