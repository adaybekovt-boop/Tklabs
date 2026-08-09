"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { AudioLines, VolumeX } from "lucide-react";

import { PromptInput } from "@/components/ui/ai-chat-input";
import {
  ERMA_VOICE_MODE_EVENT,
  isErmaVoiceModeEnabled,
  setErmaVoiceModeEnabled,
} from "@/lib/ai/voice-mode";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof PromptInput>;

export function ResponsiveChatComposer(props: Props) {
  const [voiceMode, setVoiceMode] = useState(false);
  const locale = props.locale === "ru" ? "ru" : "en";

  useEffect(() => {
    setVoiceMode(isErmaVoiceModeEnabled());
    const sync = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: unknown }>).detail?.enabled;
      if (typeof enabled === "boolean") setVoiceMode(enabled);
    };
    window.addEventListener(ERMA_VOICE_MODE_EVENT, sync);
    return () => window.removeEventListener(ERMA_VOICE_MODE_EVENT, sync);
  }, []);

  function toggleVoiceMode() {
    const next = !voiceMode;
    setVoiceMode(next);
    setErmaVoiceModeEnabled(next);
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-end px-1">
        <button
          type="button"
          onClick={toggleVoiceMode}
          aria-pressed={voiceMode}
          className={cn(
            "flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition",
            voiceMode
              ? "border-primary bg-primary text-on-primary"
              : "border-outline-variant/50 bg-surface text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
          )}
          title={locale === "ru" ? "Автоматически озвучивать готовые ответы Erma" : "Automatically speak completed Erma replies"}
        >
          {voiceMode ? <AudioLines size={15} /> : <VolumeX size={15} />}
          {locale === "ru" ? (voiceMode ? "Voice включён" : "Voice") : (voiceMode ? "Voice on" : "Voice")}
        </button>
      </div>
      <PromptInput {...props} />
    </div>
  );
}
