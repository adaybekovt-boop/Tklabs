export const TTS_MAX_TEXT_LENGTH = 2_000;
export const TTS_REQUEST_LIMIT = 10;
export const TTS_REQUEST_WINDOW_MS = 15 * 60 * 1000;
export const TTS_DAILY_CHARACTER_QUOTA = 20_000;

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
