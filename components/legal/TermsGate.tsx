"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { lockDocumentScroll } from "@/lib/document-scroll-lock";
import { CURRENT_LEGAL_BUNDLE_VERSION } from "@/lib/legal-documents";
import { getTerms, type TermsLanguage } from "@/lib/terms";

type ConsentStatus = {
  required: boolean;
  currentVersion: string;
  language: TermsLanguage | null;
};

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
  const gateRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
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
          setChecked(false);
          setStage("language");
          setError(unavailableText);
          setOpen(true);
          return;
        }
        if (payload.required) setOpen(true);
        else setOpen(false);
        if (payload.language === "ru" || payload.language === "en") setLanguage(payload.language);
      })
      .catch(() => {
        if (active) {
          setError(unavailableText);
          setOpen(true);
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, locale, retryToken]);

  useEffect(() => {
    if (!open) return;
    return lockDocumentScroll();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const firstFocusable = gateRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (firstFocusable ?? gateRef.current)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !gateRef.current) return;
      const focusable = Array.from(gateRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        gateRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === gateRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === gateRef.current)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!enabled || !open || !portalReady) return null;

  const text = getTerms(language);

  async function accept() {
    if (!checked || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/terms", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, version: CURRENT_LEGAL_BUNDLE_VERSION }),
      });
      if (!response.ok) {
        if (response.status === 409) {
          setChecked(false);
          setStage("language");
          setError(text.unavailable);
          return;
        }
        setError(response.status === 503 ? text.unavailable : text.acceptanceError);
        return;
      }
      setOpen(false);
    } catch {
      setError(text.acceptanceError);
    } finally {
      setBusy(false);
    }
  }

  const gate = (
    <div ref={gateRef} tabIndex={-1} className="fixed inset-0 z-[220] grid h-[100dvh] w-screen overflow-hidden bg-primary/75 p-0 outline-none md:overflow-y-auto md:p-8" role="dialog" aria-modal="true" aria-labelledby="terms-gate-title" data-terms-gate>
      <div className="flex h-full w-full flex-col justify-center overflow-y-auto border border-primary bg-surface p-6 shadow-2xl md:m-auto md:h-auto md:max-h-[calc(100dvh-4rem)] md:max-w-3xl md:justify-start md:overflow-visible md:p-10" data-terms-gate-panel>
        {stage === "language" ? (
          <div className="mx-auto max-w-xl py-8 text-center sm:py-14">
            <p className="label-caps mb-6 text-secondary">TK LAB / REQUIRED</p>
            <h1 id="terms-gate-title" className="headline-title">{text.chooseLanguage}</h1>
            <p className="mt-5 leading-[1.7] text-on-surface-variant">{text.requiredNotice}</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {(["ru", "en"] as const).map((nextLanguage) => (
                <button
                  key={nextLanguage}
                  type="button"
                  className="quiet-button quiet-button--dark w-full"
                  onClick={() => {
                    setLanguage(nextLanguage);
                    setStage("terms");
                    setError(null);
                  }}
                >
                  {getTerms(nextLanguage).languageName}
                </button>
              ))}
            </div>
            {error && (
              <div className="mt-6 space-y-3">
                <p className="text-[13px] text-error">{error}</p>
                <button type="button" className="label-caps border-b border-primary pb-1 text-primary" onClick={() => { setError(null); setRetryToken((value) => value + 1); }}>
                  {text.retry}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div data-terms-gate-body className="flex min-h-0 flex-1 flex-col md:block md:flex-none">
            <div className="flex shrink-0 flex-col gap-5 border-b border-primary pb-7 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="label-caps mb-4 text-secondary">{text.label}</p>
                <h1 id="terms-gate-title" className="headline-title">{text.title}</h1>
                <p className="mt-3 text-[14px] text-on-surface-variant">{text.effectiveDate} · {text.versionLabel} {CURRENT_LEGAL_BUNDLE_VERSION}</p>
              </div>
              <button type="button" className="label-caps text-secondary underline underline-offset-4 hover:text-primary" onClick={() => setStage("language")}>RU / EN</button>
            </div>
            <p className="mt-7 shrink-0 max-w-2xl leading-[1.7] text-on-surface-variant">{text.intro}</p>
            <div className="mt-8 min-h-0 flex-1 overflow-y-auto border-y border-outline-variant py-7 pr-3 md:max-h-[52vh] md:flex-none" data-terms-gate-scroll>
              <div className="space-y-10">
                {text.sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="font-serif text-[23px] leading-[1.25]">{section.title}</h2>
                    <div className="mt-4 space-y-4 text-[14px] leading-[1.75] text-on-surface-variant">
                      {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    </div>
                  </section>
                ))}
              </div>
            </div>
            <label className="mt-7 flex shrink-0 cursor-pointer items-start gap-3 text-[14px] leading-[1.6]">
              <input type="checkbox" className="mt-1 size-4 accent-primary" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
              <span>{text.readAgreement}</span>
            </label>
            {error && <p className="mt-4 shrink-0 text-[13px] text-error">{error}</p>}
            <div className="mt-7 flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between" data-terms-gate-actions>
              <span className="text-[12px] text-secondary">{text.versionLabel} {CURRENT_LEGAL_BUNDLE_VERSION}</span>
              <button type="button" className="quiet-button quiet-button--dark" disabled={!checked || busy} onClick={() => void accept()}>
                {busy ? "…" : text.accept}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(gate, document.body);
}
