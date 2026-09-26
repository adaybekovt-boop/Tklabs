"use client";

import { useState } from "react";
import Link from "next/link";
import { homeCopy } from "./home-copy";
import type { Locale } from "@/lib/i18n";

export function VersionWorkbench({ locale }: { locale: Locale }) {
  const copy = homeCopy(locale);
  const [version, setVersion] = useState<1 | 2>(2);
  return <section className="home-versions" id="versions" aria-labelledby="versions-title">
    <div className="version-intro"><h2 id="versions-title">{copy.iterationTitle}</h2><p>{copy.iterationText}</p><Link href="/vault" className="home-text-link">{copy.dataControl}<span aria-hidden="true">↗</span></Link></div>
    <div className="version-workbench">
      <div className="version-toolbar"><span>{copy.tabs[3]}<span className="version-slash"> / </span>{copy.file}</span><span>{copy.local}</span></div>
      <div className="version-layout">
        <div className="version-rail" role="group" aria-label={copy.versionLabel}>{([1, 2] as const).map(item => <button type="button" key={item} aria-pressed={version === item} onClick={() => setVersion(item)}><span>v{item}</span><strong>{item === 1 ? copy.draft : copy.revised}</strong><span aria-hidden="true">{version === item ? "↗" : "↳"}</span></button>)}</div>
        <article className="version-document" aria-live="polite" aria-atomic="true"><p className="version-document-meta">{copy.source}: <Link href="/truth">TK Labs / {copy.ru ? "Принципы" : "Principles"}</Link></p><h3>{copy.resultTitle}</h3>{version === 1 ? <p key="draft" className="version-content">{copy.result} {copy.ru ? "Снимок Sync зашифрован на сервере, но это не сквозное шифрование. Для генерации запроса используется внешний AI-провайдер." : "The Sync snapshot is encrypted at rest, not end-to-end. Generation uses an external AI provider."}</p> : <ol key="checklist" className="version-content">{copy.checks.map(check => <li key={check}>{check}</li>)}</ol>}</article>
      </div>
    </div>
    <p className="home-storage-note">{copy.storage}</p>
  </section>;
}
