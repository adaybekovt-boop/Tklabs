import { useEffect, useRef, useState } from "react";

import { TTS_MAX_TEXT_LENGTH } from "@/lib/tts-rate-limit";
import type { Locale } from "@/lib/i18n";
import type { ChatMessage } from "@/components/playground/MessageList";

function preferredBrowserVoice(locale: Locale) {
  const language = locale === "ru" ? "ru" : "en";
  return window.speechSynthesis.getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith(language))
    .sort((left, right) => {
      const score = (voice: SpeechSynthesisVoice) => {
        const name = voice.name.toLowerCase();
        return (voice.lang.toLowerCase() === `${language}-${language === "ru" ? "ru" : "us"}` ? 4 : 0)
          + (/natural|neural|premium|enhanced|google|microsoft/.test(name) ? 3 : 0)
          + (voice.localService ? 1 : 0);
      };
      return score(right) - score(left);
    })[0];
}

export function useSpeech(locale: Locale, ttsAvailable: boolean, labels: { voiceUnsupported: string; speechFailed: string; copyFailed: string }) {
  const [speechMessageId, setSpeechMessageId] = useState<string | null>(null);
  const [speechNotice, setSpeechNotice] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const ttsRequestRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  function releaseAudio() {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }

  function stopSpeech() {
    ttsRequestRef.current?.abort();
    ttsRequestRef.current = null;
    releaseAudio();
    window.speechSynthesis?.cancel();
    setSpeechMessageId(null);
  }

  function speakWithBrowser(message: ChatMessage) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechMessageId(null);
      setSpeechNotice(labels.voiceUnsupported);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message.content);
    const voice = preferredBrowserVoice(locale);
    if (voice) utterance.voice = voice;
    utterance.lang = locale === "ru" ? "ru-RU" : "en-US";
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onend = () => setSpeechMessageId((current) => current === message.id ? null : current);
    utterance.onerror = () => {
      setSpeechMessageId((current) => current === message.id ? null : current);
      setSpeechNotice(labels.speechFailed);
    };
    setSpeechMessageId(message.id);
    window.speechSynthesis.speak(utterance);
  }

  async function copyMessage(message: ChatMessage) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(message.content);
      else {
        const area = document.createElement("textarea");
        area.value = message.content;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1600);
    } catch {
      setSpeechNotice(labels.copyFailed);
    }
  }

  async function speakMessage(message: ChatMessage) {
    setSpeechNotice("");
    if (!message.content.trim()) return;
    if (speechMessageId === message.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    if (!ttsAvailable || message.content.length > TTS_MAX_TEXT_LENGTH) {
      speakWithBrowser(message);
      return;
    }
    setSpeechMessageId(message.id);
    const controller = new AbortController();
    ttsRequestRef.current = controller;
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({ text: message.content, locale }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && response.body && contentType.includes("audio/")) {
        const audioUrl = URL.createObjectURL(await response.blob());
        if (controller.signal.aborted) {
          URL.revokeObjectURL(audioUrl);
          return;
        }
        const audio = new Audio(audioUrl);
        audio.preload = "auto";
        audioRef.current = audio;
        audioUrlRef.current = audioUrl;
        audio.onended = () => {
          if (audioRef.current !== audio) return;
          releaseAudio();
          setSpeechMessageId((current) => current === message.id ? null : current);
        };
        audio.onerror = () => {
          if (audioRef.current !== audio) return;
          releaseAudio();
          speakWithBrowser(message);
        };
        try {
          await audio.play();
          return;
        } catch {
          if (audioRef.current === audio) releaseAudio();
          if (controller.signal.aborted) return;
        }
      } else if (response.body) await response.body.cancel().catch(() => undefined);
      if (!controller.signal.aborted) speakWithBrowser(message);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError") && !controller.signal.aborted) speakWithBrowser(message);
    } finally {
      if (ttsRequestRef.current === controller) ttsRequestRef.current = null;
    }
  }

  useEffect(() => () => {
    ttsRequestRef.current?.abort();
    releaseAudio();
    window.speechSynthesis?.cancel();
  }, []);

  return { speechMessageId, speechNotice, copiedMessageId, stopSpeech, speakMessage, copyMessage };
}
