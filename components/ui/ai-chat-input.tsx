"use client";

import * as React from "react";
import { ArrowUp, FileText, Mic, Plus, Square, WifiOff, X } from "lucide-react";

import { ChatOverlay } from "@/components/playground/ChatOverlay";
import { DOCUMENT_ACCEPT, extractDocumentFile } from "@/lib/documents/extract";
import { AUTO_ERMA_MODEL_KEY } from "@/lib/models/public";
import { cn } from "@/lib/utils";

export type ChatEffort = "low" | "medium" | "high";

export type ChatInputModel = {
  id: string;
  name: string;
  tierLabel: string;
  markSrc?: string;
  status?: string;
  available: boolean;
};

export type ChatInputAttachment = {
  id: string;
  file: File;
  name: string;
  content: string;
  url: string;
};

export type ChatInputSubmitMeta = {
  model: string;
  effort: ChatEffort;
  attachments: Array<{ name: string; content: string }>;
};

export type PromptInputLabels = {
  effort: string;
  effortLow: string;
  effortMedium: string;
  effortHigh: string;
  model: string;
  request: string;
  openAttachment: string;
  addAttachment: string;
  close: string;
  stopRecording: string;
  send: string;
  voiceInput: string;
  voiceUnsupported: string;
  voiceDenied: string;
  listening: string;
  attachmentTooLarge: string;
  stopGeneration: string;
};

type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, meta: ChatInputSubmitMeta) => boolean | void;
  models?: ChatInputModel[];
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  responseMode?: unknown;
  onResponseModeChange?: (mode: never) => void;
  reasonEnabled?: boolean;
  onReasonEnabledChange?: (enabled: boolean) => void;
  onAttachmentsChange?: (attachments: ChatInputAttachment[]) => void;
  onOpenWorkspace?: () => void;
  disabled?: boolean;
  busy?: boolean;
  onStop?: () => void;
  placeholder?: string;
  maxLength?: number;
  attachmentsEnabled?: boolean;
  labels: PromptInputLabels;
  voiceLanguage: string;
  maxAttachmentBytes?: number;
  maxAttachmentContextLength?: number;
  className?: string;
}

export const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(function PromptInput(
  {
    value,
    onChange,
    onSubmit,
    selectedModelId = AUTO_ERMA_MODEL_KEY,
    onAttachmentsChange,
    disabled = false,
    busy = false,
    onStop,
    placeholder = "",
    maxLength = 180,
    attachmentsEnabled = false,
    labels,
    voiceLanguage,
    maxAttachmentBytes = 16 * 1024,
    maxAttachmentContextLength = 8_000,
    className,
  },
  forwardedRef,
) {
  const locale = voiceLanguage.toLowerCase().startsWith("ru") ? "ru" : "en";
  const [attachments, setAttachments] = React.useState<ChatInputAttachment[]>([]);
  const [activeAttachment, setActiveAttachment] = React.useState<ChatInputAttachment | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const [voiceError, setVoiceError] = React.useState("");
  const [attachmentError, setAttachmentError] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const attachmentsRef = React.useRef<ChatInputAttachment[]>([]);
  const transcriptBaseRef = React.useRef("");
  const canSubmit = Boolean(value.trim()) && value.length <= maxLength && !disabled && !busy && !recording && online;

  React.useEffect(() => {
    attachmentsRef.current = attachments;
    onAttachmentsChange?.(attachments);
  }, [attachments, onAttachmentsChange]);

  React.useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  React.useEffect(() => () => {
    recognitionRef.current?.stop();
    attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url));
  }, []);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), 176)}px`;
  }, [value]);

  function submit() {
    if (!canSubmit) return;
    const accepted = onSubmit(value.trim(), {
      model: selectedModelId || AUTO_ERMA_MODEL_KEY,
      effort: "medium",
      attachments: attachments.map(({ name, content }) => ({ name, content })),
    });
    if (accepted === false) return;
    onChange("");
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    setAttachments([]);
    setVoiceError("");
    setAttachmentError("");
  }

  async function addFiles(files: FileList | null) {
    if (!files || !attachmentsEnabled) return;
    setAttachmentError("");
    const room = Math.max(0, 3 - attachments.length);
    const candidates = Array.from(files);
    let rejected = candidates.length > room;
    let contextLength = attachments.reduce((total, attachment) => total + Array.from(`[${attachment.name}]\n${attachment.content}`).length + 2, 0);
    const next: ChatInputAttachment[] = [];

    for (const file of candidates.slice(0, room)) {
      try {
        const extracted = await extractDocumentFile(file, {
          maxSourceBytes: 2 * 1024 * 1024,
          maxOutputBytes: maxAttachmentBytes,
          maxCharacters: maxAttachmentContextLength,
        });
        const additionLength = Array.from(`[${extracted.name}]\n${extracted.content}`).length + 2;
        if (contextLength + additionLength > maxAttachmentContextLength) {
          rejected = true;
          continue;
        }
        next.push({
          id: `${extracted.name}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          name: extracted.name,
          content: extracted.content,
          url: URL.createObjectURL(file),
        });
        contextLength += additionLength;
      } catch {
        rejected = true;
      }
    }

    if (rejected) setAttachmentError(labels.attachmentTooLarge);
    setAttachments((current) => [...current, ...next]);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((attachment) => attachment.id !== id);
    });
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
  }

  function startRecording() {
    if (busy || disabled) return;
    setVoiceError("");
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError(labels.voiceUnsupported);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = voiceLanguage;
    transcriptBaseRef.current = value.trim();
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      const spoken = `${finalText}${interimText}`.trim();
      const prefix = transcriptBaseRef.current;
      onChange(`${prefix}${prefix && spoken ? " " : ""}${spoken}`.slice(0, maxLength));
      if (finalText.trim()) transcriptBaseRef.current = `${prefix}${prefix ? " " : ""}${finalText.trim()}`;
    };
    recognition.onerror = () => {
      setVoiceError(labels.voiceDenied);
      setRecording(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setRecording(false);
    };
    recognitionRef.current = recognition;
    setRecording(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setRecording(false);
      setVoiceError(labels.voiceDenied);
    }
  }

  function handlePrimaryAction() {
    if (busy) {
      onStop?.();
      return;
    }
    if (recording) {
      stopRecording();
      return;
    }
    if (value.trim()) {
      submit();
      return;
    }
    startRecording();
  }

  const primaryLabel = busy
    ? labels.stopGeneration
    : recording
      ? labels.stopRecording
      : value.trim()
        ? labels.send
        : labels.voiceInput;
  const primaryDisabled = disabled || (busy ? !onStop : recording ? false : value.trim() ? !canSubmit : !online);

  return (
    <div ref={forwardedRef} data-testid="prompt-input" className={cn("relative mx-auto w-full max-w-[780px]", className)}>
      {attachmentsEnabled && (
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept={DOCUMENT_ACCEPT}
          multiple
          aria-label={labels.addAttachment}
          onChange={(event) => {
            void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      )}

      <div className="overflow-hidden rounded-[1.55rem] border border-outline-variant bg-surface-container-lowest shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary)_7%,transparent)] focus-within:border-primary">
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative flex h-11 max-w-[210px] shrink-0 items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 pr-9">
                <button type="button" onClick={() => setActiveAttachment(attachment)} className="flex min-w-0 items-center gap-2 text-left text-[11px] text-on-surface-variant" aria-label={`${labels.openAttachment} ${attachment.name}`}>
                  <FileText size={15} className="shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                </button>
                <button type="button" onClick={() => removeAttachment(attachment.id)} className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container" aria-label={`${labels.close} ${attachment.name}`}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1 px-2 pb-2 pt-2 sm:px-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!attachmentsEnabled || disabled || attachments.length >= 3}
            className="relative grid size-11 shrink-0 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
            aria-label={labels.addAttachment}
          >
            <Plus size={19} />
            {attachments.length > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-primary text-[9px] text-on-primary">{attachments.length}</span>}
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
            onKeyDown={(event) => {
              const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;
              const desktopEnter = window.matchMedia("(pointer: fine) and (min-width: 768px)").matches;
              if (event.key === "Enter" && !event.shiftKey && !isComposing && desktopEnter) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            enterKeyHint="enter"
            aria-label={labels.request}
            className="block min-h-11 max-h-44 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-[16px] leading-6 text-primary outline-none placeholder:text-on-secondary-container disabled:opacity-60"
          />

          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={primaryDisabled}
            className={cn("grid size-11 shrink-0 place-items-center rounded-full shadow-sm disabled:opacity-25", busy || value.trim() ? "bg-primary text-on-primary" : "bg-surface-container-low text-primary")}
            aria-label={primaryLabel}
          >
            {busy || recording ? <Square size={14} fill="currentColor" /> : value.trim() ? <ArrowUp size={18} /> : <Mic size={18} />}
          </button>
        </div>

        {recording && <div className="px-4 pb-2 text-[11px] font-medium text-primary" role="status">{labels.listening}</div>}
        {!online && <div className="flex items-center gap-2 px-4 pb-2 text-[11px] text-error" role="status"><WifiOff size={13} />{locale === "ru" ? "Нет сети. Черновик сохранён." : "Offline. Draft saved."}</div>}
      </div>

      {voiceError && <p className="mt-2 px-2 text-[11px] text-error" role="status">{voiceError}</p>}
      {attachmentError && <p className="mt-2 px-2 text-[11px] text-error" role="status">{attachmentError}</p>}

      <ChatOverlay open={Boolean(activeAttachment)} onClose={() => setActiveAttachment(null)} labelledBy="attachment-preview-title" className="p-0" closeLabel={labels.close}>
        {activeAttachment && (
          <>
            <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4">
              <p id="attachment-preview-title" className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary"><FileText size={16} /><span className="truncate">{activeAttachment.name}</span></p>
              <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-surface-container-low" onClick={() => setActiveAttachment(null)} aria-label={labels.close}><X size={17} /></button>
            </div>
            <pre className="max-h-[68dvh] overflow-auto whitespace-pre-wrap px-5 py-5 text-left text-[13px] leading-[1.7] text-primary">{activeAttachment.content}</pre>
          </>
        )}
      </ChatOverlay>
    </div>
  );
});

PromptInput.displayName = "PromptInput";
