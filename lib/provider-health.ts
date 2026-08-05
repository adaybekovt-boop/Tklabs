export type HealthStatus = "operational" | "degraded" | "down" | "not_configured";

export type HealthCheck = {
  id: string;
  status: HealthStatus;
  latencyMs: number | null;
  required?: boolean;
};

export type HealthPayload = {
  checkedAt: string;
  source: "live" | "cache" | "stale";
  stale: boolean;
  ok: boolean;
  services: HealthCheck[];
};

export type HealthStatusStub = {
  getStatus(): Promise<HealthPayload>;
};

export type HealthStatusNamespace = {
  getByName(name: string): HealthStatusStub;
};
