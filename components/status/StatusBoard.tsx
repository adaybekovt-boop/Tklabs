"use client";

import { Check, CircleAlert, CircleX, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";

type HealthStatus = "operational" | "degraded" | "down" | "not_configured";

type HealthCheck = {
  id: string;
  status: HealthStatus;
  latencyMs: number | null;
  required?: boolean;
};

type HealthPayload = {
  checkedAt: string;
  services: HealthCheck[];
};

function statusIcon(status: HealthStatus) {
  if (status === "operational") return <Check size={16} />;
  if (status === "down") return <CircleX size={16} />;
  return <CircleAlert size={16} />;
}

export function StatusBoard({ locale }: { locale: Locale }) {
  const text = getDictionary(locale);
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Health check failed");
      setPayload((await response.json()) as HealthPayload);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The fetch callback synchronizes the initial view with the external health endpoint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
  }, []);

  const statusById = useMemo(() => new Map(payload?.services.map((service) => [service.id, service]) ?? []), [payload]);
  const requiredServices = payload?.services.filter((service) => service.required !== false) ?? [];
  const headline = loading
    ? text.status.checking
    : failed
      ? text.status.down
      : requiredServices.some((service) => service.status === "down")
        ? text.status.down
        : requiredServices.some((service) => service.status !== "operational")
          ? text.status.partial
          : text.status.allWorking;
  const checkedLabel = payload
    ? `${text.status.lastChecked}: ${new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(payload.checkedAt))}`
    : text.status.checked;
  const serviceIds = ["inference", "auth", "access", "clodex"];

  function statusLabel(status: HealthStatus | undefined) {
    if (status === "operational") return text.status.working;
    if (status === "degraded") return text.status.degraded;
    if (status === "down") return text.status.unavailable;
    return text.status.notConfigured;
  }

  return (
    <>
      <section className="editorial-enter mb-section-gap grid gap-12 border-b border-outline-variant/30 pb-16 md:grid-cols-12">
        <div className="md:col-span-8" />
        <div className="flex items-end md:col-span-4">
          <div className="w-full border border-primary bg-white p-8">
            <span className="mb-5 block size-3 bg-primary" />
            <p className="headline-title text-[26px]">{headline}</p>
            <p className="label-caps mt-4 text-secondary">{checkedLabel}</p>
            <button type="button" onClick={() => void loadStatus()} disabled={loading} className="label-caps mt-6 flex items-center gap-2 text-secondary hover:text-primary disabled:opacity-50">
              {loading ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {text.status.refresh}
            </button>
          </div>
        </div>
      </section>
      <section className="mb-section-gap">
        <h2 className="headline-title mb-8">{text.status.infrastructure}</h2>
        <div className="border-t border-outline-variant/30">
          {text.status.services.map((service, index) => {
            const check = statusById.get(serviceIds[index]);
            const status = check?.status;
            return (
              <div key={service} className="editorial-card grid items-center gap-4 border-b border-outline-variant/30 py-7 md:grid-cols-12">
                <span className="md:col-span-6">{service}</span>
                <span className="label-caps flex items-center gap-2 text-secondary md:col-span-3">{status ? statusIcon(status) : <LoaderCircle size={16} className="animate-spin" />} {statusLabel(status)}</span>
                <span className="flex items-center justify-end gap-3 text-[13px] md:col-span-3">{check?.latencyMs != null ? `${check.latencyMs} ${text.status.ms}` : "—"}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
