export const CLODEX_REQUEST_LIMIT = 5;
export const CLODEX_REQUEST_WINDOW_MS = 15 * 60 * 1000;

export type ClodexAccessStatus = {
  active: boolean;
  unlimited?: boolean;
  limit: number;
  windowMs: number;
  remaining: number;
  resetAt: number | null;
};

export type ClodexRedeemResult = ClodexAccessStatus & {
  redeemed: boolean;
  error?: "invalid_code" | "not_configured" | "too_many_attempts";
  retryAt?: number;
};

export type ClodexConsumeResult = ClodexAccessStatus & {
  allowed: boolean;
  reservationId?: string;
  error?: "access_required" | "limit_reached";
  retryAt?: number;
};

export type ClodexReleaseResult = ClodexAccessStatus & {
  released: boolean;
  reservationId?: string;
};
