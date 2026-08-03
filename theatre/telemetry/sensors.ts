import { formatUptime } from "./clock";
import { seededUnit, valueNoise } from "./seed";

export type SensorId = "load" | "coolant" | "latency" | "confidence";

export interface SensorDefinition {
  id: SensorId;
  label: string;
  unit: string;
  base: number;
  amplitude: number;
  precision: number;
  accent: "lime" | "orange" | "blue" | "white";
}

export interface SensorReading extends SensorDefinition {
  value: number;
  history: number[];
}

export interface TelemetrySnapshot {
  uptimeSeconds: number;
  uptime: string;
  readings: SensorReading[];
  rackCount: number;
  incidentCount: number;
}

export const SENSOR_DEFINITIONS: SensorDefinition[] = [
  {
    id: "load",
    label: "Inference load",
    unit: "%",
    base: 61,
    amplitude: 14,
    precision: 1,
    accent: "lime",
  },
  {
    id: "coolant",
    label: "Coolant temperature",
    unit: "°C",
    base: 19.6,
    amplitude: 2.4,
    precision: 1,
    accent: "blue",
  },
  {
    id: "latency",
    label: "Average latency",
    unit: "ms",
    base: 412,
    amplitude: 48,
    precision: 0,
    accent: "orange",
  },
  {
    id: "confidence",
    label: "Confidence theater",
    unit: "%",
    base: 87,
    amplitude: 7,
    precision: 1,
    accent: "white",
  },
];

function getSensorValue(sensor: SensorDefinition, timeSeconds: number, demoPulse: number) {
  const wave = Math.sin(timeSeconds / 31 + seededUnit(sensor.id) * 6.28) * 0.5 + 0.5;
  const noise = valueNoise(sensor.id, timeSeconds, 23) - 0.5;
  const delayedLoad = Math.sin((timeSeconds - 8) / 31 + seededUnit("load") * 6.28) * 0.5 + 0.5;
  const correlation = sensor.id === "coolant" ? delayedLoad * 0.8 : 0;
  const pulse = demoPulse * (sensor.id === "latency" ? 1.25 : 1);
  return sensor.base + sensor.amplitude * (wave * 0.55 + noise * 0.45 - 0.2) + correlation + pulse;
}

function historyFor(sensor: SensorDefinition, timeSeconds: number, demoPulse: number) {
  return Array.from({ length: 28 }, (_, index) => {
    const sampledTime = timeSeconds - (27 - index) * 2.5;
    const value = getSensorValue(sensor, sampledTime, demoPulse * Math.max(0, 1 - index / 28));
    const normalized = (value - (sensor.base - sensor.amplitude)) / (sensor.amplitude * 2.2);
    return Math.max(8, Math.min(100, normalized * 100));
  });
}

export function getTelemetrySnapshot(timeSeconds: number, demoPulse = 0): TelemetrySnapshot {
  const readings = SENSOR_DEFINITIONS.map((sensor) => ({
    ...sensor,
    value: getSensorValue(sensor, timeSeconds, demoPulse),
    history: historyFor(sensor, timeSeconds, demoPulse),
  }));

  return {
    uptimeSeconds: timeSeconds,
    uptime: formatUptime(timeSeconds),
    readings,
    rackCount: 128,
    incidentCount: 2,
  };
}

export function formatReading(reading: SensorReading) {
  return `${reading.value.toFixed(reading.precision)}${reading.unit}`;
}
