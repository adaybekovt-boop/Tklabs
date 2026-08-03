"use client";

import { useEffect, useMemo, useState } from "react";

import { formatReading, getTelemetrySnapshot } from "@/theatre/telemetry/sensors";
import { secondsSinceEpoch, TELEMETRY_BOOT_SECONDS } from "@/theatre/telemetry/clock";
import type { TelemetrySnapshot } from "@/theatre/telemetry/sensors";

const initialSnapshot = getTelemetrySnapshot(TELEMETRY_BOOT_SECONDS);

function SensorCard({
  reading,
  index,
}: {
  reading: TelemetrySnapshot["readings"][number];
  index: number;
}) {
  return (
    <article className={`sensor-card sensor-${reading.accent}`}>
      <div className="sensor-card-top">
        <span className="sensor-index">0{index + 1} / sensor</span>
        <span className="sensor-live">
          <span className="status-dot" /> live
        </span>
      </div>
      <div className="sensor-value-row">
        <strong>{formatReading(reading)}</strong>
        <span>{reading.label}</span>
      </div>
      <div className="sensor-graph" aria-hidden="true">
        {reading.history.map((height, pointIndex) => (
          <i key={`${reading.id}-${pointIndex}`} style={{ height: `${height}%` }} />
        ))}
      </div>
      <div className="sensor-card-bottom">
        <span>range / nominal</span>
        <span>{reading.unit === "ms" ? "200—520" : "stable"}</span>
      </div>
    </article>
  );
}

export function TelemetryWall() {
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

    return () => {
      window.removeEventListener("facility:demo-start", handleDemoStart);
      window.clearInterval(timer);
    };
  }, [demoStartedAt]);

  const summary = useMemo(() => {
    const load = snapshot.readings.find((reading) => reading.id === "load")?.value ?? 0;
    const coolant = snapshot.readings.find((reading) => reading.id === "coolant")?.value ?? 0;
    return { load: load.toFixed(1), coolant: coolant.toFixed(1) };
  }, [snapshot]);

  return (
    <div className="telemetry-wall">
      <div className="telemetry-summary">
        <div>
          <span className="eyebrow">03 / THEATRE TELEMETRY</span>
          <h2>Numbers that look like<br /><em>proof.</em></h2>
        </div>
        <div className="telemetry-summary-copy">
          <p>
            A seeded signal engine keeps the fictional facility internally
            consistent. Same clock, same values, no random jumps.
          </p>
          <div className="summary-readout">
            <span>facility uptime</span>
            <strong>{snapshot.uptime}</strong>
          </div>
        </div>
      </div>
      <div className="sensor-grid">
        {snapshot.readings.map((reading, index) => (
          <SensorCard index={index} key={reading.id} reading={reading} />
        ))}
      </div>
      <div className="telemetry-footer">
        <span>rack count / {snapshot.rackCount}</span>
        <span>load / {summary.load}%</span>
        <span>coolant / {summary.coolant}°C</span>
        <span>incidents / {snapshot.incidentCount}</span>
      </div>
    </div>
  );
}
