"use client";

import * as React from "react";
import Image from "next/image";
import {
  ArrowUp,
  ChevronDown,
  FileText,
  Gauge,
  Mic,
  Plus,
  SlidersHorizontal,
  Square,
  WifiOff,
  X,
} from "lucide-react";

import { ChatOverlay } from "@/components/playground/ChatOverlay";
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

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

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

function ModelMark({ model, active = false }: { model?: ChatInputModel; active?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl border p-1",
        active ? "border-primary bg-primary/10" : "border-outline-variant bg-surface-container-low",
      )}
    >
      <Image src={model?.markSrc ?? "/images/models/model-mark.png"} alt="" width={24} height={24} className="size-full object-contain" />
    </span>
  );
}

function EffortBars({ count }: { count: number }) {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden="true">
      {[7, 11, 15].map((height, index) => (
        <i key={height} className="w-[2px] bg-current" style={{ height, opacity: index < count ? 1 : 0.2 }} />
      ))}
    </span>
  );
}

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, meta: ChatInputSubmitMeta) => boolean | void;
  models: ChatInputModel[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
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
    models,
    selectedModelId,
    onModelChange,
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
  const efforts: Array<{ id: ChatEffort; label: string; bars: number }> = [
    { id: "low", label: labels.effortLow, bars: 1 },
    { id: "medium", label: labels.effortMedium, bars: 2 },
    { id: "high", label: labels.effortHigh, bars: 3 },
  ];
  const [modelMenuOpen, setModelMenuOpen] = React.useState(false);
  const [effortIndex, setEffortIndex] = React.useState(0);
  const [attachments, setAttachments] = React.useState<ChatInputAttachment[]>([]);
  const [activeAttachment, setActiveAttachment] = React.useState<ChatInputAttachment | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [voiceError, setVoiceError] = React.useState("");
  const [attachmentError, setAttachmentError] = React.useState("");

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const attachmentsRef = React.useRef<ChatInputAttachment[]>([]);
  const transcriptBaseRef = React.useRef("");

  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0];
  const effort = efforts[effortIndex] ?? efforts[1];
  const canSubmit = Boolean(value.trim()) && value.length <= maxLength && !disabled && !busy && !isRecording && isOnline;
  const offlineLabel = voiceLanguage.toLowerCase().startsWith("ru")
    ? "Нет сети. Черновик сохранён на устройстве."
    : "You are offline. The draft is saved on this device.";
  const settingsLabel = voiceLanguage.toLowerCase().startsWith("ru") ? "Модель и параметры" : "Model and settings";

  const groupedModels = React.useMemo(() => {
    const groups = new Map<string, ChatInputModel[]>();
    for (const model of models) {
      const entries = groups.get(model.tierLabel) ?? [];
      entries.push(model);
      groups.set(model.tierLabel, entries);
    }
    return [...groups.entries()];
  }, [models]);

  React.useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    };
  }, []);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), 160)}px`;
  }, [value]);

  function assignRoot(node: HTMLDivElement | null) {
    rootRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  function submit() {
    if (!canSubmit || !selectedModel) return;
    const accepted = onSubmit(value.trim(), {
      model: selectedModel.id,
      effort: effort.id,
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
    if (!files) return;
    setAttachmentError("");
    const room = Math.max(0, 3 - attachments.length);
    const candidates = Array.from(files);
    let hasRejectedFile = candidates.length > room;
    let contextLength = attachments.reduce(
      (total, attachment) => total + Array.from(`[${attachment.name}]\n${attachment.content}`).length + 2,
      0,
    );
    const next: ChatInputAttachment[] = [];

    for (const file of candidates.slice(0, room)) {
      if (file.size > maxAttachmentBytes || !(file.type.startsWith("text/") || /\.(md|txt)$/i.test(file.name))) {
        hasRejectedFile = true;
        continue;
      }
      const content = await file.text();
      const contentBytes = new TextEncoder().encode(content).byteLength;
      const additionLength = Array.from(`[${file.name.trim()}]\n${content.trim()}`).length + 2;
      if (
        !file.name.trim()
        || Array.from(file.name.trim()).length > 120
        || !content.trim()
        || contentBytes > maxAttachmentBytes
        || contextLength + additionLength > maxAttachmentContextLength
      ) {
        hasRejectedFile = true;
        continue;
      }
      next.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        content,
        url: URL.createObjectURL(file),
      });
      contextLength += additionLength;
    }

    if (hasRejectedFile) setAttachmentError(labels.attachmentTooLarge);
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
    setIsRecording(false);
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
      setIsRecording(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsRecording(false);
      setVoiceError(labels.voiceDenied);
    }
  }

  return (
    <div ref={assignRoot} data-testid="prompt-input" className={cn("relative mx-auto w-full max-w-[780px]", className)}>
      {attachmentsEnabled && (
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="text/plain,text/markdown,.txt,.md"
          multiple
          aria-label={labels.addAttachment}
          onChange={(event) => {
            void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      )}

      <div className="overflow-hidden rounded-[1.35rem] border border-outline-variant bg-surface-container-lowest shadow-[0_8px_28px_color-mix(in_srgb,var(--color-primary)_6%,transparent)] focus-within:border-primary sm:rounded-[1.5rem]">
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-outline-variant px-3 py-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="group relative flex h-11 max-w-[180px] shrink-0 items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 pr-9">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left text-[11px] text-on-surface-variant"
                  onClick={() => setActiveAttachment(attachment)}
                  aria-label={`${labels.openAttachment} ${attachment.name}`}
                >
                  <FileText size={15} className="shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container hover:text-primary"
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={`${labels.close} ${attachment.name}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

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
            if (event.key === "Escape" && modelMenuOpen) {
              event.preventDefault();
              setModelMenuOpen(false);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          enterKeyHint="enter"
          className="block min-h-11 max-h-40 w-full resize-none overflow-y-auto bg-transparent px-4 pb-2 pt-3 text-[15px] leading-7 text-primary outline-none placeholder:text-on-secondary-container disabled:opacity-60"
          aria-label={labels.request}
        />

        {isRecording && <div className="px-4 pb-2 text-[11px] font-medium text-primary" role="status">{labels.listening}</div>}
        {!isOnline && (
          <div className="flex items-center gap-2 px-4 pb-2 text-[11px] text-error" role="status">
            <WifiOff size={13} aria-hidden="true" /> {offlineLabel}
          </div>
        )}

        <div className="flex min-w-0 items-center gap-1.5 px-2 pb-2 sm:gap-2">
          <button
            type="button"
            className="hidden h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-2.5 text-left text-[12px] font-medium text-on-surface-variant hover:bg-surface-container hover:text-primary sm:flex sm:max-w-[280px]"
            onClick={() => setModelMenuOpen(true)}
            aria-expanded={modelMenuOpen}
            aria-haspopup="listbox"
            title={selectedModel?.name ?? labels.model}
          >
            <ModelMark model={selectedModel} />
            <span className="min-w-0 flex-1 truncate">{selectedModel?.name ?? labels.model}</span>
            <ChevronDown size={13} className="shrink-0" />
          </button>

          <button
            type="button"
            className="hidden size-10 shrink-0 items-center justify-center gap-1 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary sm:flex sm:w-auto sm:px-3"
            onClick={() => setEffortIndex((index) => (index + 1) % efforts.length)}
            title={`${labels.effort}: ${effort.label}`}
            aria-label={`${labels.effort}: ${effort.label}`}
          >
            <EffortBars count={effort.bars} />
            <span className="hidden text-[11px] md:inline">{effort.label}</span>
          </button>

          <button
            type="button"
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-left text-[11px] font-medium text-on-surface-variant sm:hidden"
            onClick={() => setModelMenuOpen(true)}
            aria-expanded={modelMenuOpen}
            aria-haspopup="dialog"
            aria-label={settingsLabel}
          >
            <SlidersHorizontal size={15} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{selectedModel?.name ?? labels.model}</span>
            <span className="shrink-0 text-[10px] text-on-secondary-container">{effort.label}</span>
          </button>

          {attachmentsEnabled && (
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= 3 || disabled}
              aria-label={labels.addAttachment}
            >
              <Plus size={16} />
            </button>
          )}

          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || busy}
            aria-label={isRecording ? labels.stopRecording : labels.voiceInput}
            aria-pressed={isRecording}
          >
            {isRecording ? <Square size={13} fill="currentColor" /> : <Mic size={16} />}
          </button>

          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-on-primary shadow-sm hover:opacity-85 disabled:opacity-25"
            onClick={() => {
              if (busy) onStop?.();
              else submit();
            }}
            disabled={disabled || (busy ? !onStop : !canSubmit)}
            aria-label={busy ? labels.stopGeneration : labels.send}
          >
            {busy ? <Square size={13} fill="currentColor" /> : <ArrowUp size={17} />}
          </button>
        </div>
      </div>

      {voiceError && <div className="mt-2 px-1 text-[11px] text-error" role="status">{voiceError}</div>}
      {attachmentError && <div className="mt-2 px-1 text-[11px] text-error" role="status">{attachmentError}</div>}

      <ChatOverlay open={modelMenuOpen} onClose={() => setModelMenuOpen(false)} labelledBy="chat-model-picker-title" position="responsive" className="p-3" closeLabel={labels.close}>
        <div>
          <div className="mb-3 border-b border-outline-variant px-2 pb-3 sm:hidden">
            <p className="label-caps mb-3 text-on-secondary-container">{labels.effort}</p>
            <div className="grid grid-cols-3 gap-2">
              {efforts.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setEffortIndex(index)}
                  aria-pressed={effortIndex === index}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[11px]",
                    effortIndex === index
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline-variant bg-surface",
                  )}
                >
                  <EffortBars count={entry.bars} /> {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div role="listbox" aria-label={labels.model} aria-labelledby="chat-model-picker-title">
            <p id="chat-model-picker-title" className="label-caps mb-2 px-2 text-on-secondary-container">{labels.model}</p>
            {groupedModels.map(([tier, tierModels]) => (
              <div className="border-b border-outline-variant py-2 last:border-0" key={tier}>
                <p className="label-caps px-2 pb-2 text-on-secondary-container">{tier}</p>
                {tierModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    disabled={!model.available}
                    className={cn(
                      "my-1 flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] hover:bg-surface-container-low disabled:opacity-35",
                      selectedModelId === model.id && "bg-surface-container-low text-primary",
                    )}
                    role="option"
                    aria-selected={selectedModelId === model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setModelMenuOpen(false);
                    }}
                  >
                    <ModelMark model={model} active={selectedModelId === model.id} />
                    <span className="min-w-0 flex-1 truncate">{model.name}</span>
                    {model.status && <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">{model.status}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </ChatOverlay>

      <ChatOverlay open={Boolean(activeAttachment)} onClose={() => setActiveAttachment(null)} labelledBy="attachment-preview-title" className="p-0" closeLabel={labels.close}>
        {activeAttachment && (
          <>
            <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4">
              <p id="attachment-preview-title" className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary">
                <FileText size={16} /> <span className="truncate">{activeAttachment.name}</span>
              </p>
              <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-surface-container-low" onClick={() => setActiveAttachment(null)} aria-label={labels.close}>
                <X size={17} />
              </button>
            </div>
            <pre className="max-h-[68dvh] overflow-auto whitespace-pre-wrap px-5 py-5 text-left text-[13px] leading-[1.7] text-primary">{activeAttachment.content}</pre>
          </>
        )}
      </ChatOverlay>

      <span className="sr-only"><Gauge /> {labels.effort}: {effort.label}</span>
    </div>
  );
});

PromptInput.displayName = "PromptInput";
