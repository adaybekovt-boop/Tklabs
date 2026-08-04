"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { secondsSinceEpoch, TELEMETRY_BOOT_SECONDS } from "@/theatre/telemetry/clock";
import { getTelemetrySnapshot } from "@/theatre/telemetry/sensors";
import type { TelemetrySnapshot } from "@/theatre/telemetry/sensors";

const initialSnapshot = getTelemetrySnapshot(TELEMETRY_BOOT_SECONDS);

/* The only motion left in this file tracks an actual changing value.
   Entrance staggers and hover lifts were decoration and are gone. */
function AnimatedValue({ value, accent }: { value: number; accent: string }) {
  const spring = useSpring(0, { mass: 0.2, stiffness: 80, damping: 15 });
  const display = useTransform(spring, (v) => v.toFixed(1));
  useEffect(() => spring.set(value), [value, spring]);
  return <motion.strong style={{ color: accent === "lime" ? "var(--primary)" : `var(--${accent})` }}>{display}</motion.strong>;
}

function GraphBar({ height, accent }: { height: number; accent: string }) {
  const springHeight = useSpring(0, { mass: 0.3, stiffness: 70, damping: 14 });
  useEffect(() => springHeight.set(height), [height, springHeight]);
  return <motion.i style={{ height: useTransform(springHeight, (v) => `${v}%`) }} className={`sensor-${accent}`} />;
}

function SensorCard({ reading, index }: { reading: TelemetrySnapshot["readings"][number]; index: number }) {
  const { copy } = useLanguage();
  const label = copy.telemetry.labels[reading.id];
  return (
    <article className={`sensor-card sensor-${reading.accent}`}>
      <div className="sensor-card-top">
        <span className="sensor-index">0{index + 1} / {copy.telemetry.sensor}</span>
        <span className="sensor-live"><span className="status-dot" /> {copy.telemetry.live}</span>
      </div>
      <div className="sensor-value-row"><AnimatedValue value={reading.value} accent={reading.accent} /><span>{label}</span></div>
      <div className="sensor-graph" aria-hidden="true">
        {reading.history.map((height, pointIndex) => <GraphBar key={`${reading.id}-${pointIndex}`} height={height} accent={reading.accent} />)}
      </div>
      <div className="sensor-card-bottom">
        <span>{copy.telemetry.range}</span>
        <span>{reading.unit === "ms" ? "200—520" : copy.telemetry.stable}</span>
      </div>
    </article>
  );
}

export function TelemetryWall() {
  const { copy } = useLanguage();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [demoStartedAt, setDemoStartedAt] = useState<number | null>(null);

  useEffect(() => {
    const handleDemoStart = () => setDemoStartedAt(Date.now());
    window.addEventListener("facility:demo-start", handleDemoStart);
    const timer = window.setInterval(() => {
      const pulse = demoStartedAt ? Math.max(0, 18 - (Date.now() - demoStartedAt) / 100) : 0;
      setSnapshot(getTelemetrySnapshot(secondsSinceEpoch(), pulse));
      if (pulse === 0 && demoStartedAt) setDemoStartedAt(null);
    }, 160);
    return () => { window.removeEventListener("facility:demo-start", handleDemoStart); window.clearInterval(timer); };
  }, [demoStartedAt]);

  const summary = useMemo(() => ({
    load: snapshot.readings.find((reading) => reading.id === "load")?.value.toFixed(1) ?? "0.0",
    coolant: snapshot.readings.find((reading) => reading.id === "coolant")?.value.toFixed(1) ?? "0.0",
  }), [snapshot]);

  return (
    <div className="telemetry-wall">
      <div className="telemetry-summary">
        <div><h2>{copy.telemetry.titleLead}<br /><em>{copy.telemetry.titleAccent}</em></h2></div>
        <div className="telemetry-summary-copy">
          <p>{copy.telemetry.copy}</p>
          <div className="summary-readout"><span>{copy.telemetry.uptime}</span><strong>{snapshot.uptime}</strong></div>
        </div>
      </div>
      <div className="sensor-grid">
        {snapshot.readings.map((reading, index) => <SensorCard index={index} key={reading.id} reading={reading} />)}
      </div>
      <div className="telemetry-footer">
        <span>{copy.telemetry.racks} / {snapshot.rackCount}</span>
        <span>{copy.telemetry.load} / {summary.load}%</span>
        <span>{copy.telemetry.coolant} / {summary.coolant}°C</span>
        <span>{copy.telemetry.incidents} / {snapshot.incidentCount}</span>
      </div>
    </div>
  );
}
