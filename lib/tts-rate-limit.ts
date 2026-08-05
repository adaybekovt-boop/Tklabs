export const TTS_MAX_TEXT_LENGTH = 2_000;
export const TTS_REQUEST_LIMIT = 5;
export const TTS_REQUEST_WINDOW_MS = 15 * 60 * 1000;
export const TTS_DAILY_CHARACTER_QUOTA = 10_000;
export const TTS_PRIVILEGED_REQUEST_LIMIT = 30;
export const TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA = 100_000;
export const TTS_RESERVATION_TTL_MS = 2 * 60 * 1000;

export type TtsPolicy = {
  requestLimit: number;
  requestWindowMs: number;
  dailyCharacterQuota: number;
};

function positiveInteger(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max ? parsed : fallback;
}

export function getTtsPolicy(privileged: boolean, env: Record<string, string | undefined> = process.env): TtsPolicy {
  return privileged
    ? {
        requestLimit: positiveInteger(env.TTS_PRIVILEGED_REQUEST_LIMIT, TTS_PRIVILEGED_REQUEST_LIMIT, 10_000),
        requestWindowMs: TTS_REQUEST_WINDOW_MS,
        dailyCharacterQuota: positiveInteger(env.TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA, TTS_PRIVILEGED_DAILY_CHARACTER_QUOTA, 10_000_000),
      }
    : {
        requestLimit: positiveInteger(env.TTS_REQUEST_LIMIT, TTS_REQUEST_LIMIT, 10_000),
        requestWindowMs: TTS_REQUEST_WINDOW_MS,
        dailyCharacterQuota: positiveInteger(env.TTS_DAILY_CHARACTER_QUOTA, TTS_DAILY_CHARACTER_QUOTA, 10_000_000),
      };
}

export type TtsRateLimitStatus = {
  requestLimit: number;
  requestWindowMs: number;
  requestsRemaining: number;
  requestResetAt: number | null;
  dailyCharacterQuota: number;
  charactersRemaining: number;
  dayResetAt: number;
};

export type TtsReservationResult = TtsRateLimitStatus & {
  allowed: boolean;
  reservationId?: string;
  error?: "parallel_request" | "request_limit" | "daily_quota";
};

export type TtsReservationReleaseResult = TtsRateLimitStatus & {
  released: boolean;
  reservationId: string;
};
