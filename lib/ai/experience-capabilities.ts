import { getErmaCapabilities } from "@/lib/models/capabilities";

export type ErmaExperienceCapability = {
  id: "memory" | "attention" | "voice-input" | "voice-output" | "vision" | "actions" | "proactive";
  layer: "client" | "orchestration" | "provider";
  modelIndependent: boolean;
  ready: boolean;
  note: string;
};

/**
 * Product capabilities are intentionally separated from provider model features.
 * Memory and Attention are TK LAB orchestration layers, so switching the backing
 * LLM does not remove them. Voice input/output likewise sit around the text model.
 */
export function getErmaExperienceCapabilities(modelKey: string, options: {
  ttsConfigured?: boolean;
  visionConfigured?: boolean;
} = {}): ErmaExperienceCapability[] {
  const model = getErmaCapabilities(modelKey);
  return [
    {
      id: "memory",
      layer: "orchestration",
      modelIndependent: true,
      ready: true,
      note: "User-confirmed local memory is injected as bounded untrusted context.",
    },
    {
      id: "attention",
      layer: "client",
      modelIndependent: true,
      ready: true,
      note: "High-confidence conversation signals are detected locally before any optional model-assisted layer.",
    },
    {
      id: "voice-input",
      layer: "client",
      modelIndependent: true,
      ready: true,
      note: "Speech-to-text is a transport/input concern; the current text model receives the resulting prompt.",
    },
    {
      id: "voice-output",
      layer: "provider",
      modelIndependent: true,
      ready: options.ttsConfigured === true,
      note: "Assistant text can be streamed to the existing TTS route without changing the reasoning model.",
    },
    {
      id: "vision",
      layer: "provider",
      modelIndependent: false,
      ready: options.visionConfigured === true,
      note: "Image understanding requires a live multimodal provider route and fails closed when unavailable.",
    },
    {
      id: "actions",
      layer: "orchestration",
      modelIndependent: false,
      ready: model.toolCalling.enabled,
      note: "The current Erma catalog supports the read-only tool loop. Mutating actions need separate confirmation-scoped tools.",
    },
    {
      id: "proactive",
      layer: "orchestration",
      modelIndependent: true,
      ready: false,
      note: "Requires an explicit user-created watch/task scheduler; no hidden background monitoring is enabled.",
    },
  ];
}
