"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Check, Copy, ExternalLink, Heart, Landmark, LockKeyhole, ShieldCheck } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import type { PublicSupportAvailability, RevealedSupportMethod, SupportMethod } from "@/lib/support-config";
import { cn } from "@/lib/utils";

const PRESETS = [500, 1000, 2500, 5000] as const;

function formatKzt(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-KZ" : "en-KZ", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

const FALLBACK_AVAILABILITY: PublicSupportAvailability = {
  enabled: true,
  donationAlertsUrl: "https://www.donationalerts.com/r/xenonraze",
  methods: [],
  verification: "provider-or-manual",
};

export function SupportPanel({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [availability, setAvailability] = useState<PublicSupportAvailability>(FALLBACK_AVAILABILITY);
  const [selected, setSelected] = useState<number>(1000);
  const [custom, setCustom] = useState("");
  const [alias, setAlias] = useState("");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<RevealedSupportMethod | null>(null);
  const [loadingMethod, setLoadingMethod] = useState<SupportMethod | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/support", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("support-unavailable");
        const payload = (await response.json()) as PublicSupportAvailability;
        if (!cancelled) setAvailability(payload);
      })
      .catch(() => { if (!cancelled) setAvailability(FALLBACK_AVAILABILITY); });
    return () => { cancelled = true; };
  }, []);

  const amount = useMemo(() => {
    const parsed = Number(custom.replace(/\s/g, ""));
    if (custom.trim() && Number.isFinite(parsed)) return Math.max(100, Math.min(Math.floor(parsed), 10_000_000));
    return selected;
  }, [custom, selected]);

  async function reveal(method: SupportMethod) {
    setLoadingMethod(method);
    setDetails(null);
    setCopied(false);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!response.ok) throw new Error("support-method-unavailable");
      setDetails((await response.json()) as RevealedSupportMethod);
    } catch {
      setDetails(null);
    } finally {
      setLoadingMethod(null);
    }
  }

  async function copyDetails() {
    if (!details) return;
    const text = `${details.label}\n${details.recipient}\n${details.value}\n${formatKzt(amount, locale)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const methods = availability.methods ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <section className="border border-outline-variant/40 bg-surface-container-low p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps text-secondary">{ru ? "ДОБРОВОЛЬНАЯ ПОДДЕРЖКА" : "VOLUNTARY SUPPORT"}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-primary">{ru ? "Поддержать TK LAB" : "Support TK LAB"}</h2>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant/50 bg-surface text-primary"><Heart size={20} /></div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant">
          {ru ? "Основной способ поддержки — DonationAlerts. TK LAB не принимает карту, CVV, банковский логин или данные транзакции: платёж и подтверждение происходят на стороне DonationAlerts." : "The primary support path is DonationAlerts. TK LAB never receives card details, CVV, banking credentials, or transaction data: payment and confirmation happen on DonationAlerts."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => (
            <button key={preset} type="button" onClick={() => { setSelected(preset); setCustom(""); }} className={cn("min-h-11 border px-3 text-sm font-medium transition", !custom && selected === preset ? "border-primary bg-primary text-on-primary" : "border-outline-variant/50 bg-surface text-primary hover:bg-surface-container")}>{formatKzt(preset, locale)}</button>
          ))}
        </div>

        <label className="mt-3 block text-xs font-medium text-on-surface-variant">
          {ru ? "Своя сумма, ₸" : "Custom amount, ₸"}
          <input value={custom} onChange={(event) => setCustom(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))} inputMode="numeric" placeholder={ru ? "Например, 1500" : "For example, 1500"} className="mt-2 min-h-11 w-full border border-outline-variant/50 bg-surface px-3 text-base text-primary outline-none focus:border-primary" />
        </label>

        <div className="mt-6 border-t border-outline-variant/30 pt-5">
          <p className="text-sm font-semibold text-primary">{ru ? "Приватный предпросмотр" : "Private preview"}</p>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">{ru ? "Имя, сообщение и выбранная сумма существуют только в этой вкладке. Мы не отправляем их на сервер. На DonationAlerts вы введёте итоговые данные уже непосредственно перед переводом." : "Name, message, and selected amount exist only in this tab. We do not send them to the server. You enter the final details on DonationAlerts immediately before payment."}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-on-surface-variant">{ru ? "Имя / ник (необязательно)" : "Name / alias (optional)"}<input value={alias} onChange={(event) => setAlias(event.target.value.slice(0, 48))} className="mt-2 min-h-11 w-full border border-outline-variant/50 bg-surface px-3 text-sm text-primary outline-none focus:border-primary" placeholder={ru ? "Аноним" : "Anonymous"} /></label>
            <label className="text-xs font-medium text-on-surface-variant">{ru ? "Сообщение (необязательно)" : "Message (optional)"}<input value={message} onChange={(event) => setMessage(event.target.value.slice(0, 120))} className="mt-2 min-h-11 w-full border border-outline-variant/50 bg-surface px-3 text-sm text-primary outline-none focus:border-primary" placeholder={ru ? "Спасибо за проект" : "Thanks for the project"} /></label>
          </div>
        </div>

        <a href={availability.donationAlertsUrl} target="_blank" rel="noreferrer noopener" className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-4 text-sm font-semibold text-on-primary transition hover:opacity-90"><Heart size={17} />{ru ? "Перейти к донату через DonationAlerts" : "Donate via DonationAlerts"}<ExternalLink size={15} /></a>
        <p className="mt-2 text-center text-[11px] leading-5 text-on-surface-variant">{ru ? `Выбранная здесь сумма: ${formatKzt(amount, locale)}. Она не передаётся автоматически — это сделано специально, чтобы TK LAB не был посредником платежа.` : `Selected here: ${formatKzt(amount, locale)}. It is intentionally not transferred automatically, so TK LAB never becomes a payment intermediary.`}</p>

        {methods.length ? (
          <div className="mt-6 border-t border-outline-variant/30 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">{ru ? "Резервный перевод" : "Fallback transfer"}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={!methods.includes("kaspi") || loadingMethod !== null} onClick={() => void reveal("kaspi")} className="flex min-h-12 items-center justify-center gap-2 border border-outline-variant/60 bg-surface px-4 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"><Banknote size={17} />{loadingMethod === "kaspi" ? (ru ? "Открываю…" : "Revealing…") : "Kaspi Gold"}</button>
              <button type="button" disabled={!methods.includes("bank") || loadingMethod !== null} onClick={() => void reveal("bank")} className="flex min-h-12 items-center justify-center gap-2 border border-outline-variant/60 bg-surface px-4 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40"><Landmark size={17} />{loadingMethod === "bank" ? (ru ? "Открываю…" : "Revealing…") : (ru ? "По IBAN" : "Bank / IBAN")}</button>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="space-y-4">
        <div className="border border-outline-variant/40 bg-primary p-6 text-on-primary">
          <p className="label-caps opacity-70">TK LAB · SUPPORT CARD</p>
          <p className="mt-8 text-4xl font-semibold tracking-tight">{formatKzt(amount, locale)}</p>
          <p className="mt-4 text-sm font-semibold">{alias.trim() || (ru ? "Анонимная поддержка" : "Anonymous supporter")}</p>
          <p className="mt-2 min-h-10 text-sm leading-5 opacity-80">{message.trim() || (ru ? "Эта карточка — только локальный предпросмотр." : "This card is a local-only preview.")}</p>
        </div>

        {details ? (
          <div className="border border-outline-variant/50 bg-surface p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-primary">{details.label}</p><p className="mt-1 text-xs text-on-surface-variant">{ru ? "Реквизиты раскрыты только в этой сессии" : "Details revealed for this session only"}</p></div><LockKeyhole size={18} className="text-secondary" /></div>
            <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-on-surface-variant">{ru ? "Получатель" : "Recipient"}</dt><dd className="mt-1 break-all font-medium text-primary">{details.recipient}</dd></div><div><dt className="text-xs text-on-surface-variant">{details.method === "kaspi" ? (ru ? "Телефон Kaspi" : "Kaspi phone") : "IBAN"}</dt><dd className="mt-1 break-all font-mono text-primary">{details.value}</dd></div><div><dt className="text-xs text-on-surface-variant">{ru ? "Выбранная сумма" : "Selected amount"}</dt><dd className="mt-1 font-semibold text-primary">{formatKzt(amount, locale)}</dd></div></dl>
            <button type="button" onClick={() => void copyDetails()} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 border border-outline-variant/60 bg-surface-container-low px-4 text-sm font-semibold text-primary hover:bg-surface-container">{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? (ru ? "Скопировано" : "Copied") : (ru ? "Скопировать реквизиты" : "Copy details")}</button>
            <p className="mt-4 text-xs leading-5 text-on-surface-variant">{ru ? "Ручной перевод не подтверждается сайтом автоматически. Факт операции проверяется получателем в банковском приложении." : "Manual transfers are not automatically verified by the site. The recipient verifies them in the banking app."}</p>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="border border-outline-variant/40 bg-surface-container-low p-4"><ShieldCheck size={18} className="text-secondary" /><p className="mt-3 text-sm font-semibold text-primary">{ru ? "Платёж вне TK LAB" : "Payment outside TK LAB"}</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">{ru ? "DonationAlerts обрабатывает форму и платёж. TK LAB не получает платёжные данные и не ведёт базу доноров." : "DonationAlerts handles the form and payment. TK LAB receives no payment data and keeps no donor database."}</p></div>
          <div className="border border-outline-variant/40 bg-surface-container-low p-4"><LockKeyhole size={18} className="text-secondary" /><p className="mt-3 text-sm font-semibold text-primary">{ru ? "Без покупки привилегий" : "No paid privileges"}</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">{ru ? "Поддержка добровольная и не открывает Pro-функции, лимиты или отдельный доступ." : "Support is voluntary and does not unlock Pro features, quotas, or special access."}</p></div>
        </div>
      </aside>
    </div>
  );
}
