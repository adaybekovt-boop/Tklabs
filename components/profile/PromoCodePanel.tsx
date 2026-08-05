"use client";

import { useState } from "react";

type PromoLabels = {
  trigger: string;
  label: string;
  placeholder: string;
  submit: string;
  close: string;
  success: string;
  invalid: string;
  unavailable: string;
};

export function PromoCodePanel({ labels }: { labels: PromoLabels }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function redeem() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    setSuccess(false);
    try {
      const response = await fetch("/api/profile/access", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const payload = await response.json() as { redeemed?: boolean; error?: string };
      if (!response.ok) {
        setMessage(response.status >= 500 ? labels.unavailable : labels.invalid);
        return;
      }
      if (!payload.redeemed) {
        setMessage(labels.invalid);
        return;
      }
      setSuccess(true);
      setMessage(labels.success);
      setCode("");
    } catch {
      setMessage(labels.unavailable);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="label-caps border-b border-primary pb-2 text-primary" onClick={() => setOpen(true)}>
        {labels.trigger} ↗
      </button>
    );
  }

  return (
    <form className="max-w-xl border border-outline-variant p-5" onSubmit={(event) => { event.preventDefault(); void redeem(); }}>
      <div className="flex items-start justify-between gap-5">
        <label htmlFor="clodex-promo-code" className="label-caps text-secondary">{labels.label}</label>
        <button type="button" className="text-[12px] text-secondary underline underline-offset-4" onClick={() => { setOpen(false); setMessage(null); }}>
          {labels.close}
        </button>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          id="clodex-promo-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={labels.placeholder}
          autoComplete="off"
          spellCheck={false}
          className="min-h-12 min-w-0 flex-1 border border-primary bg-transparent px-4 outline-none placeholder:text-secondary focus:ring-2 focus:ring-primary/30"
        />
        <button type="submit" className="quiet-button quiet-button--dark min-h-12" disabled={!code.trim() || busy}>
          {busy ? "…" : labels.submit}
        </button>
      </div>
      {message && <p className={`mt-4 text-[13px] ${success ? "text-primary" : "text-error"}`} aria-live="polite">{message}</p>}
    </form>
  );
}
