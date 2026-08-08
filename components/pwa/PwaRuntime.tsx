"use client";

/* eslint-disable react-hooks/set-state-in-effect -- browser/PWA state hydrates after mount. */

import { Download, RefreshCw, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type InstallOutcome = { outcome: "accepted" | "dismissed"; platform: string };
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallOutcome>;
};

const INSTALL_DISMISSED_KEY = "tklabs.pwa-install-dismissed.v1";

function standaloneMode() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone === true;
}

export function PwaRuntime() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [offline, setOffline] = useState(false);
  const [locale, setLocale] = useState<"ru" | "en">("ru");
  const [updateReady, setUpdateReady] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    setLocale(document.documentElement.lang === "en" ? "en" : "ru");
    setOffline(!navigator.onLine);
    try {
      setDismissed(window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    function handleOnline() { setOffline(false); }
    function handleOffline() { setOffline(true); }
    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      if (!standaloneMode()) setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setInstallPrompt(null);
      setDismissed(true);
    }
    function handleControllerChange() {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);

    let cancelled = false;
    function observeRegistration(registration: ServiceWorkerRegistration) {
      if (cancelled) return;
      registrationRef.current = registration;
      if (registration.waiting && navigator.serviceWorker.controller) setUpdateReady(true);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller && registration.waiting) setUpdateReady(true);
        });
      });
    }

    function registerWorker() {
      if (cancelled || process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          observeRegistration(registration);
          return registration.update();
        })
        .catch(() => undefined);
    }

    if (document.readyState === "complete") registerWorker();
    else window.addEventListener("load", registerWorker, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", registerWorker);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  function dismissInstall() {
    setDismissed(true);
    try { window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1"); } catch { /* Restricted storage must not block the interface. */ }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      setDismissed(true);
    }
  }

  function applyUpdate() {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) {
      setUpdateReady(false);
      return;
    }
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  const hiddenRoute = pathname.startsWith("/playground") || pathname.startsWith("/login") || pathname.startsWith("/offline");
  const showInstall = Boolean(installPrompt) && !dismissed && !hiddenRoute && !offline && !updateReady;
  const showUpdate = updateReady && !hiddenRoute && !offline;
  const labels = locale === "ru"
    ? {
        offline: "Нет сети",
        offlineDescription: "Статический интерфейс доступен, но AI-запросы требуют подключения.",
        install: "Установить приложение",
        installDescription: "Открывайте TK Lab с главного экрана в отдельном окне.",
        dismiss: "Скрыть предложение установки",
        update: "Доступно обновление",
        updateDescription: "Новая версия TK Lab готова. Обновление применяется одним перезапуском интерфейса.",
        applyUpdate: "Обновить сейчас",
        dismissUpdate: "Отложить обновление",
      }
    : {
        offline: "Offline",
        offlineDescription: "The static interface remains available, but AI requests require a connection.",
        install: "Install app",
        installDescription: "Open TK Lab from the home screen in its own window.",
        dismiss: "Dismiss install suggestion",
        update: "Update available",
        updateDescription: "A new TK Lab version is ready. Applying it requires one interface reload.",
        applyUpdate: "Update now",
        dismissUpdate: "Later",
      };

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {offline ? `${labels.offline}. ${labels.offlineDescription}` : updateReady ? labels.update : ""}
      </div>

      {showUpdate ? (
        <aside className="fixed inset-x-3 bottom-[calc(5.45rem+env(safe-area-inset-bottom,0px))] z-[95] mx-auto max-w-md rounded-2xl border border-primary/30 bg-surface-container-lowest p-3 shadow-[0_18px_60px_rgba(0,0,0,.2)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:mx-0 lg:w-[380px]" aria-label={labels.update} data-pwa-update-prompt>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary"><RefreshCw size={17} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-primary">{labels.update}</p><p className="mt-1 text-xs leading-[1.55] text-on-surface-variant">{labels.updateDescription}</p></div>
            <button type="button" onClick={() => setUpdateReady(false)} className="grid size-10 shrink-0 place-items-center rounded-full text-secondary hover:bg-surface-container-low" aria-label={labels.dismissUpdate}><X size={16} aria-hidden="true" /></button>
          </div>
          <button type="button" onClick={applyUpdate} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-on-primary">{labels.applyUpdate}</button>
        </aside>
      ) : null}

      {showInstall ? (
        <aside className="fixed inset-x-3 bottom-[calc(5.45rem+env(safe-area-inset-bottom,0px))] z-[90] mx-auto max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-[0_18px_60px_rgba(0,0,0,.2)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:mx-0 lg:w-[380px]" aria-label={labels.install} data-pwa-install-prompt>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary"><Download size={17} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-primary">{labels.install}</p><p className="mt-1 text-xs leading-[1.55] text-on-surface-variant">{labels.installDescription}</p></div>
            <button type="button" onClick={dismissInstall} className="grid size-10 shrink-0 place-items-center rounded-full text-secondary hover:bg-surface-container-low" aria-label={labels.dismiss}><X size={16} aria-hidden="true" /></button>
          </div>
          <button type="button" onClick={() => void installApp()} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-on-primary">{labels.install}</button>
        </aside>
      ) : null}
    </>
  );
}
