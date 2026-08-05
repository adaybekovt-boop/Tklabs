import { TTS_RESERVATION_TTL_MS } from "@/lib/tts-rate-limit";

export type ReservationState = "reserved" | "committed" | "released" | "expired";

export function reservationExpiresAt(createdAt: number, ttlMs = TTS_RESERVATION_TTL_MS) {
  return createdAt + ttlMs;
}

export function isReservationExpired(state: ReservationState, expiresAt: number, now: number) {
  return state === "reserved" && expiresAt <= now;
}

export function canCommitReservation(state: ReservationState, expiresAt: number, now: number) {
  return state === "reserved" && expiresAt > now;
}
