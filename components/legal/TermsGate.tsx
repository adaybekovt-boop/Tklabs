"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";

import { lockDocumentScroll } from "@/lib/document-scroll-lock";
import { CURRENT_LEGAL_BUNDLE_VERSION } from "@/lib/legal-documents";
import { getTerms, type TermsLanguage } from "@/lib/terms";

type ConsentStatus = { required: boolean; currentVersion: string; language: TermsLanguage | null };

const subscribeClientReady = () => () => undefined;
const clientReadySnapshot = () => true;
const serverReadySnapshot = () => false;

export function TermsGate({ enabled, locale }: { enabled: boolean; locale: TermsLanguage }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"language" | "terms">("language");
  const [language, setLanguage] = useState<TermsLanguage>(locale);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const portalReady = useSyncExternalStore(subscribeClientReady, clientReadySnapshot, serverReadySnapshot);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const unavailableText = getTerms(locale).unavailable;
    void fetch("/api/account/terms", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as ConsentStatus & { error?: string };
        if (!response.ok) throw new Error(payload.error || "terms_status_unavailable");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        if (payload.currentVersion !== CURRENT_LEGAL_BUNDLE_VERSION) {
          setChecked(false); setStage("language"); setError(unavailableText); setOpen(true); return;
        }
        setOpen(payload.required);
        if (payload.language === "ru" || payload.language === "en") setLanguage(payload.language);
      })
      .catch(() => { if (active) { setChecked(false); setError(unavailableText); setOpen(true); } });
    return () => { active = false; };
  }, [enabled, locale, retryToken]);

  useEffect(() => {
    if (!open) return;
    return lockDocumentScroll();
  }, [open]);

  if (!enabled || !open || !portalReady) return null;
  const text = getTerms(language);

  async function accept() {
    if (!checked || busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/account/terms", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, version: CURRENT_LEGAL_BUNDLE_VERSION }),
      });
      if (!response.ok) {
        if (response.status === 409) { setChecked(false); setStage("language"); setError(text.unavailable); return; }
        setError(response.status === 503 ? text.unavailable : text.acceptanceError); return;
      }
      setChecked(false); setOpen(false);
    } catch { setError(text.acceptanceError); } finally { setBusy(false); }
  }

  const gate = (
    <div
      className="fixed inset-0 z-[220] flex h-[100dvh] w-screen items-stretch justify-center overflow-hidden bg-primary/75 sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-gate-title"
      data-terms-gate
    >
      <div
        className="flex h-[100dvh] min-h-0 w-full max-w-3xl flex-col overflow-hidden border-primary bg-surface shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-4rem)] sm:rounded-[1.5rem] sm:border"
        data-terms-gate-panel
      >
        {stage === "language" ? (
          <div className="flex min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:px-10 sm:py-10" data-terms-gate-scroll>
            <div className="m-auto w-full max-w-xl py-6 text-center sm:py-10">
              <p className="label-caps mb-6 text-secondary">TK LAB / TRUST CENTER</p>
              <h1 id="terms-gate-title" className="headline-title">{text.chooseLanguage}</h1>
              <p className="mt-5 leading-[1.7] text-on-surface-variant">{text.requiredNotice}</p>
              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {(["ru", "en"] as const).map((nextLanguage) => (
                  <button
                    key={nextLanguage}
                    type="button"
                    className="quiet-button quiet-button--dark w-full"
                    onClick={() => { setLanguage(nextLanguage); setStage("terms"); setError(null); }}
                  >
                    {getTerms(nextLanguage).languageName}
                  </button>
                ))}
              </div>
              {error && (
                <div className="mt-6 space-y-3" aria-live="polite">
                  <p className="text-[13px] text-error">{error}</p>
                  <button type="button" className="label-caps border-b border-primary pb-1 text-primary" onClick={() => { setError(null); setRetryToken((value) => value + 1); }}>{text.retry}</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-outline-variant bg-surface px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:px-10 sm:pb-6 sm:pt-8" data-terms-gate-header>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="label-caps mb-3 text-secondary">{text.label}</p>
                  <h1 id="terms-gate-title" className="headline-title">{text.title}</h1>
                  <p className="mt-2 text-[12px] text-on-surface-variant sm:text-[14px]">Legal bundle · {CURRENT_LEGAL_BUNDLE_VERSION}</p>
                </div>
                <button type="button" className="min-h-11 shrink-0 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary underline underline-offset-4 hover:text-primary" onClick={() => { setChecked(false); setStage("language"); }}>RU / EN</button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-10 sm:py-7" data-terms-gate-scroll>
              <p className="max-w-2xl leading-[1.7] text-on-surface-variant">{text.intro}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] underline underline-offset-4">
                <Link href="/legal/privacy" target="_blank" rel="noreferrer">Privacy</Link>
                <Link href="/legal/acceptable-use" target="_blank" rel="noreferrer">Acceptable Use</Link>
                <Link href="/legal/ai-transparency" target="_blank" rel="noreferrer">AI Transparency</Link>
                <Link href="/legal/subprocessors" target="_blank" rel="noreferrer">Subprocessors</Link>
              </div>
              <div className="mt-7 border-y border-outline-variant py-6 sm:py-7">
                <div className="space-y-9">
                  {text.sections.map((section) => (
                    <section key={section.title}>
                      <h2 className="font-serif text-[22px] leading-[1.25] sm:text-[23px]">{section.title}</h2>
                      <div className="mt-4 space-y-4 text-[14px] leading-[1.75] text-on-surface-variant">
                        {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-outline-variant bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-14px_36px_rgba(0,0,0,.08)] sm:px-10 sm:pb-8 sm:pt-5" data-terms-gate-actions>
              <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-[1.5] sm:text-[14px] sm:leading-[1.6]">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primary" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
                <span>{text.readAgreement} · Privacy / AUP / AI Transparency</span>
              </label>
              {error && <p className="mt-3 text-[13px] text-error" aria-live="polite">{error}</p>}
              <div className="mt-4 flex items-center justify-between gap-3">
                <Link href="/api/auth/signout" className="min-h-11 py-3 text-[12px] text-secondary underline underline-offset-4">Decline / sign out</Link>
                <button type="button" className="quiet-button quiet-button--dark min-w-[9rem]" disabled={!checked || busy} onClick={() => void accept()}>{busy ? "…" : text.accept}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(gate, document.body);
}
