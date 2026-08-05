export const DEMO_REQUEST_LIMIT = 3;
export const DEMO_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;

export type DemoRateLimitStatus = {
  limit: number;
  windowMs: number;
  remaining: number;
  resetAt: number | null;
};

export type DemoConsumeResult = DemoRateLimitStatus & {
  allowed: boolean;
  reservationId?: string;
};

export type DemoReservationResult = DemoConsumeResult;

export type DemoReleaseResult = DemoRateLimitStatus & {
  released: boolean;
  reservationId: string;
};
