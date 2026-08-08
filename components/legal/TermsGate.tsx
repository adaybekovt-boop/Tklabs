"use client";

import { useEffect, useState } from "react";

import { CURRENT_TERMS_VERSION, getTerms, type TermsLanguage } from "@/lib/terms";

type ConsentStatus = {
  required: boolean;
  currentVersion: string;
  language: TermsLanguage | null;
};

export function TermsGate({ enabled, locale }: { enabled: boolean; locale: TermsLanguage }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"language" | "terms">("language");
  const [language, setLanguage] = useState<TermsLanguage>(locale);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const unavailableText = getTerms(locale).unavailable;
    const staleClientText = locale === "ru"
      ? "Соглашение обновилось. Обновите страницу, чтобы прочитать и принять актуальную редакцию."
      : "The agreement has been updated. Reload the page to review and accept the current version.";

    void fetch("/api/account/terms", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as ConsentStatus & { error?: string };
        if (!response.ok) throw new Error(payload.error || "terms_status_unavailable");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        if (payload.currentVersion !== CURRENT_TERMS_VERSION) {
          setVersionConflict(true);
          setStage("language");
          setChecked(false);
          setError(staleClientText);
          setOpen(true);
          return;
        }

        setVersionConflict(false);
        setError(null);
        if (payload.required) setOpen(true);
        else setOpen(false);
        if (payload.language === "ru" || payload.language === "en") setLanguage(payload.language);
      })
      .catch(() => {
        if (active) {
          setVersionConflict(false);
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!enabled || !open) return null;

  const text = getTerms(language);

  async function accept() {
    if (!checked || busy || versionConflict) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/terms", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, version: CURRENT_TERMS_VERSION }),
      });
      if (!response.ok) {
        if (response.status === 409) {
          setVersionConflict(true);
          setStage("language");
          setChecked(false);
          setError(language === "ru"
            ? "Версия соглашения изменилась. Обновите страницу перед продолжением."
            : "The agreement version changed. Reload the page before continuing.");
          return;
        }
        setError(response.status === 503 ? text.unavailable : text.acceptanceError);
        return;
      }
      setChecked(false);
      setOpen(false);
    } catch {
      setError(text.acceptanceError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] grid overflow-y-auto bg-primary/75 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="terms-gate-title" data-terms-gate>
      <div className="m-auto w-full max-w-3xl border border-primary bg-surface p-6 shadow-2xl sm:p-10">
        {stage === "language" ? (
          <div className="mx-auto max-w-xl py-8 text-center sm:py-14">
            <p className="label-caps mb-6 text-secondary">TK LAB / REQUIRED</p>
            <h1 id="terms-gate-title" className="headline-title">{text.chooseLanguage}</h1>
            <p className="mt-5 leading-[1.7] text-on-surface-variant">{text.requiredNotice}</p>

            {versionConflict ? (
              <div className="mt-8 rounded-2xl border border-outline-variant bg-surface-container-low p-5">
                <p className="text-[13px] leading-[1.65] text-error" role="alert">{error}</p>
                <button
                  type="button"
                  className="quiet-button quiet-button--dark mt-5 w-full"
                  onClick={() => window.location.reload()}
                >
                  {language === "ru" ? "Обновить страницу" : "Reload page"}
                </button>
              </div>
            ) : (
              <>
                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  {(["ru", "en"] as const).map((nextLanguage) => (
                    <button
                      key={nextLanguage}
                      type="button"
                      className="quiet-button quiet-button--dark w-full"
                      onClick={() => {
                        setLanguage(nextLanguage);
                        setStage("terms");
                        setChecked(false);
                        setError(null);
                      }}
                    >
                      {getTerms(nextLanguage).languageName}
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="mt-6 space-y-3">
                    <p className="text-[13px] text-error" role="alert">{error}</p>
                    <button type="button" className="label-caps border-b border-primary pb-1 text-primary" onClick={() => { setError(null); setRetryToken((value) => value + 1); }}>
                      {text.retry}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-5 border-b border-primary pb-7 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="label-caps mb-4 text-secondary">{text.label}</p>
                <h1 id="terms-gate-title" className="headline-title">{text.title}</h1>
                <p className="mt-3 text-[14px] text-on-surface-variant">{text.effectiveDate} · {text.versionLabel} {CURRENT_TERMS_VERSION}</p>
              </div>
              <button type="button" className="label-caps text-secondary underline underline-offset-4 hover:text-primary" onClick={() => { setStage("language"); setChecked(false); }}>RU / EN</button>
            </div>
            <p className="mt-7 max-w-2xl leading-[1.7] text-on-surface-variant">{text.intro}</p>
            <div className="mt-8 max-h-[48vh] overflow-y-auto border-y border-outline-variant py-7 pr-3 sm:max-h-[52vh]">
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
            <label className="mt-7 flex cursor-pointer items-start gap-3 text-[14px] leading-[1.6]">
              <input type="checkbox" className="mt-1 size-4 accent-primary" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
              <span>{text.readAgreement}</span>
            </label>
            {error && <p className="mt-4 text-[13px] text-error" role="alert">{error}</p>}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[12px] text-secondary">{text.versionLabel} {CURRENT_TERMS_VERSION}</span>
              <button type="button" className="quiet-button quiet-button--dark" disabled={!checked || busy} onClick={() => void accept()}>
                {busy ? "…" : text.accept}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
