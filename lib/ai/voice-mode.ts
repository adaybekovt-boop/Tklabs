import type { ChatMessage } from "@/components/playground/MessageList";

export const ERMA_VOICE_MODE_KEY = "tklabs.erma.voice-mode.v1";
export const ERMA_VOICE_MODE_EVENT = "tklabs:erma-voice-mode";
export const ERMA_VOICE_REPLY_EVENT = "tklabs:erma-voice-reply";

export function isErmaVoiceModeEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ERMA_VOICE_MODE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setErmaVoiceModeEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ERMA_VOICE_MODE_KEY, enabled ? "on" : "off");
  } catch {
    // Voice mode still works for the current tab when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(ERMA_VOICE_MODE_EVENT, { detail: { enabled } }));
}

export function announceErmaVoiceReply(message: Pick<ChatMessage, "id" | "role" | "content">) {
  if (typeof window === "undefined" || message.role !== "assistant" || !message.content.trim()) return;
  window.dispatchEvent(new CustomEvent(ERMA_VOICE_REPLY_EVENT, { detail: { message } }));
}
