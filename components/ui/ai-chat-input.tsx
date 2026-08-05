"use client";

import * as React from "react";
import { ArrowUp, ChevronDown, FileText, Gauge, Mic, Plus, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChatEffort = "low" | "medium" | "high";

export type ChatInputModel = {
  id: string;
  name: string;
  tierLabel: string;
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

function ModelGlyph({ active = false }: { active?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 place-items-center border text-[9px] transition-colors duration-200",
        active ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-primary",
      )}
    >
      ✦
    </span>
  );
}

function EffortBars({ count }: { count: number }) {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden="true">
      {[7, 11, 15].map((height, index) => (
        <i
          key={height}
          className="w-[2px] bg-current transition-opacity duration-300"
          style={{ height, opacity: index < count ? 1 : 0.2 }}
        />
      ))}
    </span>
  );
}

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, meta: ChatInputSubmitMeta) => void;
  models: ChatInputModel[];
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  attachmentsEnabled?: boolean;
  labels: PromptInputLabels;
  voiceLanguage: string;
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
    placeholder = "",
    maxLength = 180,
    attachmentsEnabled = false,
    labels,
    voiceLanguage,
    className,
  },
  forwardedRef,
) {
  const efforts: Array<{ id: ChatEffort; label: string; bars: number }> = [
    { id: "low", label: labels.effortLow, bars: 1 },
    { id: "medium", label: labels.effortMedium, bars: 2 },
    { id: "high", label: labels.effortHigh, bars: 3 },
  ];
  const [focused, setFocused] = React.useState(false);
  const [modelMenuOpen, setModelMenuOpen] = React.useState(false);
  const [effortIndex, setEffortIndex] = React.useState(0);
  const [attachments, setAttachments] = React.useState<ChatInputAttachment[]>([]);
  const [activeAttachment, setActiveAttachment] = React.useState<ChatInputAttachment | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [voiceError, setVoiceError] = React.useState("");

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const attachmentsRef = React.useRef<ChatInputAttachment[]>([]);
  const transcriptBaseRef = React.useRef("");

  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0];
  const effort = efforts[effortIndex] ?? efforts[1];
  const expanded = focused || Boolean(value.trim()) || attachments.length > 0 || modelMenuOpen || isRecording;
  const canSubmit = Boolean(value.trim()) && value.length <= maxLength && !disabled && !isRecording;

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
    return () => {
      recognitionRef.current?.stop();
      attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    };
  }, []);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 28), 128)}px`;
  }, [value, expanded]);

  React.useEffect(() => {
    if (!modelMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setModelMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [modelMenuOpen]);

  function assignRoot(node: HTMLDivElement | null) {
    rootRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  function submit() {
    if (!canSubmit || !selectedModel) return;
    onSubmit(value.trim(), {
      model: selectedModel.id,
      effort: effort.id,
      attachments: attachments.map(({ name, content }) => ({ name, content })),
    });
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    setAttachments([]);
    setVoiceError("");
  }

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const room = Math.max(0, 3 - attachments.length);
    const incoming = Array.from(files)
      .filter((file) => file.size <= 64 * 1024 && (file.type.startsWith("text/") || /\.(md|txt)$/i.test(file.name)))
      .slice(0, room);
    const next = await Promise.all(incoming.map(async (file) => ({
      id: file.name + "-" + file.lastModified + "-" + Math.random().toString(36).slice(2, 8),
      file,
      name: file.name,
      content: (await file.text()).slice(0, 8_000),
      url: URL.createObjectURL(file),
    })));
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
      if (finalText.trim()) transcriptBaseRef.current = `${prefix}${prefix && finalText.trim() ? " " : ""}${finalText.trim()}`;
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
    <div
      ref={assignRoot}
      data-testid="prompt-input"
      className={cn("relative mx-auto w-full transition-[max-width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]", expanded ? "max-w-[780px]" : "max-w-[620px]", className)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
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

      <div
        className={cn(
          "relative overflow-visible border bg-surface-container-lowest transition-[min-height,border-color] duration-400 ease-[cubic-bezier(.2,.8,.2,1)]",
          expanded ? "min-h-[148px] border-primary" : "min-h-14 border-outline-variant",
        )}
      >
        {attachments.length > 0 && (
          <div className="prompt-attachments flex gap-2 overflow-x-auto border-b border-outline-variant px-4 py-3">
            {attachments.map((attachment, index) => (
              <button
                key={attachment.id}
                type="button"
                className="prompt-attachment group relative size-12 shrink-0 overflow-hidden border border-outline-variant bg-surface"
                style={{ animationDelay: `${index * 45}ms` }}
                onClick={() => setActiveAttachment(attachment)}
                aria-label={`${labels.openAttachment} ${attachment.name}`}
              >
                <span className="grid size-full place-items-center px-1 text-center text-[8px] uppercase leading-tight text-on-surface-variant"><FileText size={16} /><span className="mt-0.5 max-w-full truncate">{attachment.name}</span></span>
                <span
                  role="button"
                  tabIndex={-1}
                  className="absolute right-0 top-0 grid size-5 place-items-center bg-primary text-on-primary opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeAttachment(attachment.id);
                  }}
                >
                  <X size={11} />
                </span>
              </button>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape" && !value.trim()) {
              setFocused(false);
              setModelMenuOpen(false);
              textareaRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          disabled={disabled || isRecording}
          rows={1}
          className={cn(
            "block w-full resize-none overflow-y-auto bg-transparent px-4 text-[15px] leading-7 text-primary outline-none placeholder:text-on-secondary-container",
            expanded ? "pb-16 pt-4" : "h-14 py-[13px] pr-14",
          )}
          aria-label={labels.request}
        />

        {expanded && !isRecording && (
          <div className="prompt-controls absolute bottom-3 left-3 right-14 flex min-w-0 items-center gap-1">
            <div className="relative min-w-0 flex-1">
              <button
                type="button"
                className="flex h-8 w-full min-w-0 items-center gap-2 px-2 text-left text-[12px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
                onClick={() => setModelMenuOpen((open) => !open)}
                aria-expanded={modelMenuOpen}
                aria-haspopup="listbox"
                title={selectedModel?.name ?? labels.model}
              >
                <ModelGlyph />
                <span className="min-w-0 flex-1 truncate">{selectedModel?.name ?? labels.model}</span>
                <ChevronDown size={13} className={cn("transition-transform duration-300", modelMenuOpen && "rotate-180")} />
              </button>

              <div
                className={cn(
                  "absolute bottom-full left-0 z-40 mb-3 max-h-[min(360px,70vh)] w-[min(320px,calc(100vw-2rem))] origin-bottom-left overflow-y-auto border border-outline-variant bg-surface-container-lowest p-2 shadow-xl transition-[opacity,transform] duration-250 max-[420px]:fixed max-[420px]:inset-x-4 max-[420px]:bottom-24 max-[420px]:left-auto max-[420px]:top-auto max-[420px]:mb-0 max-[420px]:w-auto max-[420px]:origin-bottom",
                  modelMenuOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-[0.98] opacity-0",
                )}
                role="listbox"
                aria-label={labels.model}
              >
                {groupedModels.map(([tier, tierModels]) => (
                  <div className="border-b border-outline-variant py-2 last:border-0" key={tier}>
                    <p className="label-caps px-2 pb-2 text-on-secondary-container">{tier}</p>
                    {tierModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        disabled={!model.available}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-3 px-2 py-2 text-left text-[13px] transition-colors hover:bg-surface-container-low disabled:opacity-35",
                          selectedModelId === model.id && "bg-surface-container-low text-primary",
                        )}
                        role="option"
                        aria-selected={selectedModelId === model.id}
                        onClick={() => {
                          onModelChange(model.id);
                          setModelMenuOpen(false);
                        }}
                      >
                        <ModelGlyph active={selectedModelId === model.id} />
                        <span className="min-w-0 flex-1 truncate">{model.name}</span>
                        {model.status && <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-on-secondary-container max-[420px]:hidden">{model.status}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="flex h-8 shrink-0 items-center gap-2 px-2 text-[12px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container max-[420px]:px-1"
              onClick={() => setEffortIndex((index) => (index + 1) % efforts.length)}
              title={labels.effort}
            >
              <EffortBars count={effort.bars} />
              <span className="prompt-morph-text max-[420px]:hidden" key={effort.id}>{effort.label}</span>
            </button>

            {attachmentsEnabled && (
              <button
                type="button"
                className="ml-auto grid size-8 place-items-center text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= 3}
                aria-label={labels.addAttachment}
              >
                <Plus size={15} />
              </button>
            )}
          </div>
        )}

        {isRecording && (
          <div className="absolute bottom-3 left-4 right-14 flex h-8 items-center gap-4">
            <span className="label-caps text-primary">{labels.listening}</span>
            <span className="flex h-5 items-center gap-1" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((bar) => <i className="voice-bar w-[2px] bg-primary" key={bar} style={{ animationDelay: `${bar * 90}ms` }} />)}
            </span>
          </div>
        )}

        <button
          type="button"
          className="absolute bottom-3 right-3 grid size-8 place-items-center bg-primary text-on-primary transition-[opacity,transform] duration-200 hover:opacity-75 active:scale-90 disabled:opacity-25"
          onClick={() => {
            if (isRecording) stopRecording();
            else if (canSubmit) submit();
            else startRecording();
          }}
          disabled={disabled}
          aria-label={isRecording ? labels.stopRecording : canSubmit ? labels.send : labels.voiceInput}
        >
          <span className="prompt-action-icon" key={isRecording ? "stop" : canSubmit ? "send" : "mic"}>
            {isRecording ? <Square size={12} fill="currentColor" /> : canSubmit ? <ArrowUp size={15} /> : <Mic size={15} />}
          </span>
        </button>
      </div>
      {voiceError && (
        <div className="mt-2 px-1 text-[11px] text-error" role="status">{voiceError}</div>
      )}

      {activeAttachment && (
        <div className="prompt-preview fixed inset-0 z-[100] grid place-items-center bg-primary/85 p-6" role="dialog" aria-modal="true" onClick={() => setActiveAttachment(null)}>
          <button type="button" className="absolute right-5 top-5 grid size-10 place-items-center bg-white text-primary" onClick={() => setActiveAttachment(null)} aria-label={labels.close}>
            <X size={17} />
          </button>
          <div className="max-h-[82vh] max-w-[86vw] overflow-auto border border-on-primary/40 bg-surface p-6 text-primary" onClick={(event) => event.stopPropagation()}>
            <p className="mb-4 flex items-center gap-2 text-sm font-medium"><FileText size={16} /> {activeAttachment.name}</p>
            <pre className="max-h-[68vh] whitespace-pre-wrap text-left text-[13px] leading-[1.7]">{activeAttachment.content}</pre>
          </div>
        </div>
      )}

      <span className="sr-only"><Gauge /> {labels.effort}: {effort.label}</span>
    </div>
  );
});

PromptInput.displayName = "PromptInput";
