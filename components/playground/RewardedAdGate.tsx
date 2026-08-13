"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ExternalLink, ShieldCheck, TimerReset, X } from "lucide-react";

import { lockDocumentScroll } from "@/lib/document-scroll-lock";
import type { RewardAdStartResult, RewardAdStatus } from "@/lib/rewarded-ads";

type ActiveAd = { sessionId: string; eligibleAt: number; expiresAt: number };
type StartPayload = { result?: RewardAdStartResult; adUrl?: unknown; error?: unknown };
type CompletePayload = { result?: RewardAdStatus & { completed?: boolean; credited?: boolean; error?: string }; error?: unknown };

async function readPayload<T>(response: Response) {
  return await response.json().catch(() => null) as T | null;
}

function seconds(milliseconds: number) {
  return Math.max(0, Math.ceil(milliseconds / 1_000));
}

export function RewardedAdGate({
  open,
  locale,
  onClose,
  onUseReward,
}: {
  open: boolean;
  locale: "ru" | "en";
  onClose: () => void;
  onUseReward: () => void;
}) {
  const ru = locale === "ru";
  const [status, setStatus] = useState<RewardAdStatus | null>(null);
  const [activeAd, setActiveAd] = useState<ActiveAd | null>(null);
  const [leftForAd, setLeftForAd] = useState(false);
  const [returned, setReturned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [holding, setHolding] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
  const popupRef = useRef<Window | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeGateRef = useRef<() => void>(() => undefined);

  async function loadStatus(clearNotice = false) {
    try {
      const response = await fetch("/api/rewards/status", { cache: "no-store", credentials: "same-origin" });
      const payload = await readPayload<{ status?: RewardAdStatus; error?: unknown }>(response);
      if (response.ok && payload?.status) {
        setStatus(payload.status);
        setNow(Date.now());
        if (clearNotice) setNotice("");
      }
      else setNotice(typeof payload?.error === "string" ? payload.error : ru ? "Не удалось загрузить рекламный лимит." : "Could not load the ad allowance.");
    } catch {
      setNotice(ru ? "Не удалось загрузить рекламный лимит." : "Could not load the ad allowance.");
    }
  }

  useEffect(() => {
    if (!open) return;
    const unlockScroll = lockDocumentScroll();
    const timer = window.setTimeout(() => void loadStatus(true), 0);
    return () => {
      window.clearTimeout(timer);
      unlockScroll();
    };
    // `loadStatus` intentionally follows the currently selected locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, locale]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!activeAd) return;
    const markAway = () => setLeftForAd(true);
    const markReturn = () => {
      if (leftForAd && Date.now() >= activeAd.eligibleAt) setReturned(true);
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") markAway();
      else markReturn();
    };
    window.addEventListener("blur", markAway);
    window.addEventListener("focus", markReturn);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", markAway);
      window.removeEventListener("focus", markReturn);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [activeAd, leftForAd]);

  async function cancelSession(sessionId: string, message?: string) {
    await fetch("/api/rewards/ad/cancel", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
      keepalive: true,
    }).catch(() => undefined);
    popupRef.current?.close();
    popupRef.current = null;
    setActiveAd(null);
    setLeftForAd(false);
    setReturned(false);
    if (message) setNotice(message);
    await loadStatus();
  }

  useEffect(() => {
    if (!activeAd) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      const popup = popupRef.current;
      if (popup?.closed && current < activeAd.eligibleAt) {
        void cancelSession(activeAd.sessionId, ru ? "Рекламная вкладка была закрыта раньше времени. Просмотр не засчитан." : "The ad tab was closed too early. The view was not counted.");
      }
      if (current >= activeAd.expiresAt) {
        void cancelSession(activeAd.sessionId, ru ? "Время рекламной сессии истекло." : "The ad session expired.");
      }
    }, 500);
    return () => window.clearInterval(timer);
    // Session cancellation owns all cleanup for the active popup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAd, leftForAd, ru]);

  useEffect(() => () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    popupRef.current?.close();
  }, []);

  async function startAd() {
    if (busy || activeAd) return;
    setBusy(true);
    setNotice("");
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setBusy(false);
      setNotice(ru ? "Браузер заблокировал новую вкладку. Разрешите всплывающие окна для TK LAB." : "Your browser blocked the new tab. Allow pop-ups for TK LAB.");
      return;
    }
    popup.opener = null;
    popup.document.title = "TK LAB · Rewarded ad";
    popup.document.body.textContent = ru ? "Загрузка рекламы…" : "Loading ad…";
    try {
      const response = await fetch("/api/rewards/ad/start", { method: "POST", credentials: "same-origin" });
      const payload = await readPayload<StartPayload>(response);
      const result = payload?.result;
      if (!response.ok || !result?.allowed || typeof result.sessionId !== "string" || typeof result.eligibleAt !== "number" || typeof result.expiresAt !== "number" || typeof payload?.adUrl !== "string") {
        popup.close();
        if (result) setStatus(result);
        setNotice(ru ? "Сейчас рекламный просмотр недоступен. Проверьте лимит и попробуйте ещё раз." : "An ad view is not available right now. Check the limit and try again.");
        return;
      }
      popup.location.replace(payload.adUrl);
      popup.focus();
      popupRef.current = popup;
      setActiveAd({ sessionId: result.sessionId, eligibleAt: result.eligibleAt, expiresAt: result.expiresAt });
      setStatus(result);
      setLeftForAd(document.visibilityState === "hidden" || !document.hasFocus());
      setReturned(false);
    } catch {
      popup.close();
      setNotice(ru ? "Не удалось начать рекламную сессию." : "Could not start the ad session.");
    } finally {
      setBusy(false);
    }
  }

  async function completeAd() {
    if (!activeAd || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/rewards/ad/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: activeAd.sessionId }),
      });
      const payload = await readPayload<CompletePayload>(response);
      const result = payload?.result;
      if (!response.ok || !result?.completed) {
        setNotice(result?.error === "too_early"
          ? ru ? "Серверный таймер ещё не завершён." : "The server timer has not finished yet."
          : ru ? "Не удалось подтвердить просмотр." : "Could not confirm the view.");
        return;
      }
      popupRef.current?.close();
      popupRef.current = null;
      setStatus(result);
      setActiveAd(null);
      setLeftForAd(false);
      setReturned(false);
      setNotice(result.credited
        ? ru ? "Готово — дополнительный запрос начислен." : "Done — one additional request was credited."
        : ru ? "Первый просмотр засчитан. Осталась ещё одна реклама." : "The first view was counted. One more ad remains.");
    } catch {
      setNotice(ru ? "Не удалось подтвердить просмотр." : "Could not confirm the view.");
    } finally {
      setBusy(false);
    }
  }

  function startHold() {
    if (!activeAd || !returned || now < activeAd.eligibleAt || busy || holdTimerRef.current) return;
    setHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      setHolding(false);
      void completeAd();
    }, 1_200);
  }

  function cancelHold() {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setHolding(false);
  }

  async function closeGate() {
    if (activeAd) await cancelSession(activeAd.sessionId);
    onClose();
  }

  useEffect(() => {
    closeGateRef.current = () => {
      void closeGate();
    };
    // The ref intentionally tracks the current close function without
    // re-registering the document key handler on every state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAd, open]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (firstFocusable ?? dialogRef.current)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialogRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeGateRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === dialogRef.current)) {
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

  if (!open || typeof document === "undefined") return null;

  const countdown = activeAd ? seconds(activeAd.eligibleAt - now) : 0;
  const cooldown = status?.nextAdAt ? seconds(status.nextAdAt - now) : 0;
  const readyToConfirm = Boolean(activeAd && countdown === 0 && leftForAd && returned);
  const progress = status?.adsTowardNextRequest ?? 0;
  const canStart = Boolean(status?.canStart && status.adsRemaining > 0 && status.bonusRequests === 0 && !activeAd && cooldown === 0);

  return createPortal(
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[240] flex items-end justify-center bg-primary/70 p-0 outline-none backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="reward-ad-title" data-rewarded-ad-gate>
      <div className="max-h-[100dvh] w-full overflow-y-auto rounded-t-[2rem] border border-outline-variant bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-5 shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-caps text-secondary">ERMA · BONUS</p>
            <h2 id="reward-ad-title" className="mt-3 font-serif text-[28px] leading-tight text-primary">{ru ? "Ещё один запрос" : "One more request"}</h2>
          </div>
          <button type="button" onClick={() => void closeGate()} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-container-low" aria-label={ru ? "Закрыть" : "Close"}><X size={18} /></button>
        </div>

        <p className="mt-4 text-sm leading-6 text-on-secondary-container">{ru ? "Посмотрите две рекламные страницы. Каждый просмотр подтверждается отдельным серверным таймером и ручной проверкой после возвращения." : "View two ad pages. Each view has its own server timer and a manual confirmation after you return."}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1].map((index) => {
            const complete = progress > index || (status?.bonusRequests ?? 0) > 0;
            return <div key={index} className={`rounded-2xl border p-4 ${complete ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-low"}`}><div className="flex items-center gap-2">{complete ? <BadgeCheck size={18} /> : <span className="grid size-[18px] place-items-center rounded-full border border-outline text-[10px]">{index + 1}</span>}<span className="text-[12px] font-medium text-primary">{ru ? `Реклама ${index + 1}` : `Ad ${index + 1}`}</span></div></div>;
          })}
        </div>

        {status?.bonusRequests ? (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <BadgeCheck className="mx-auto text-primary" size={28} />
            <p className="mt-3 text-sm font-semibold text-primary">{ru ? "Бонусный запрос готов" : "Your bonus request is ready"}</p>
            <button type="button" onClick={onUseReward} className="quiet-button quiet-button--dark mt-4 w-full">{ru ? "Повторить запрос к Erma" : "Retry the Erma request"}</button>
          </div>
        ) : activeAd ? (
          <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5">
            <div className="flex items-center gap-3"><TimerReset size={20} /><div><p className="text-sm font-semibold text-primary">{countdown > 0 ? (ru ? `Подождите ${countdown} сек.` : `Wait ${countdown} sec.`) : returned ? (ru ? "Подтвердите присутствие" : "Confirm your presence") : (ru ? "Вернитесь на эту вкладку" : "Return to this tab")}</p><p className="mt-1 text-[11px] leading-5 text-on-secondary-container">{ru ? "Не закрывайте рекламную вкладку до завершения таймера." : "Keep the ad tab open until the timer finishes."}</p></div></div>
            <button
              type="button"
              disabled={!readyToConfirm || busy}
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerCancel={cancelHold}
              onPointerLeave={cancelHold}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") startHold();
              }}
              onKeyUp={cancelHold}
              className="relative mt-5 min-h-12 w-full overflow-hidden rounded-full bg-primary px-5 text-sm font-medium text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="absolute inset-y-0 left-0 bg-secondary/35 transition-[width] ease-linear" style={{ width: holding ? "100%" : "0%", transitionDuration: holding ? "1200ms" : "0ms" }} />
              <span className="relative">{ru ? "Удерживайте для подтверждения" : "Hold to confirm"}</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => void startAd()} disabled={!canStart || busy} className="quiet-button quiet-button--dark mt-6 flex w-full items-center justify-center gap-2 disabled:opacity-40"><ExternalLink size={16} />{cooldown > 0 ? (ru ? `Следующая реклама через ${cooldown} сек.` : `Next ad in ${cooldown} sec.`) : (ru ? "Смотреть рекламу" : "View ad")}</button>
        )}

        {notice && <p className="mt-4 rounded-xl bg-surface-container-low px-4 py-3 text-[12px] leading-5 text-primary" aria-live="polite">{notice}</p>}

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-outline-variant p-4 text-[11px] leading-5 text-on-secondary-container"><ShieldCheck className="mt-0.5 shrink-0" size={16} /><p>{ru ? "Откроется сторонняя рекламная страница, которая может перенаправить вас дальше. Не вводите пароли, данные карты или коды подтверждения. Таймер подтверждает только длительность перехода, а не содержание внешней страницы." : "A third-party advertising page will open and may redirect you. Do not enter passwords, card details, or verification codes. The timer confirms only the duration of the visit, not the external page content."}</p></div>

        <p className="mt-4 text-center text-[10px] text-on-secondary-container">{ru ? `За сутки: ${status?.adsCompleted ?? 0}/${status?.dailyAdLimit ?? 6} реклам` : `Today: ${status?.adsCompleted ?? 0}/${status?.dailyAdLimit ?? 6} ads`}</p>
      </div>
    </div>,
    document.body,
  );
}
