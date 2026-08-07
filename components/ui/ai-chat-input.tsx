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
import { CHAT_RESPONSE_MODES, chatResponseModeLabel, type ChatResponseMode } from "@/lib/chat-modes";
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

function ModelMark({ model, active = false }: { model?: ChatInputModel; active?: boolean }) {
  return (
    <span aria-hidden="true" className={cn("grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl border p-1", active ? "border-primary bg-primary/10" : "border-outline-variant bg-surface-container-low")}>
      <Image src={model?.markSrc ?? "/images/models/model-mark.png"} alt="" width={24} height={24} className="size-full object-contain" />
    </span>
  );
}

function EffortBars({ count }: { count: number }) {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden="true">
      {[7, 11, 15].map((height, index) => <i key={height} className="w-[2px] bg-current" style={{ height, opacity: index < count ? 1 : 0.2 }} />)}
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
  responseMode?: ChatResponseMode;
  onResponseModeChange?: (mode: ChatResponseMode) => void;
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
    models,
    selectedModelId,
    onModelChange,
    responseMode = "normal",
    onResponseModeChange,
    reasonEnabled = false,
    onReasonEnabledChange,
    onAttachmentsChange,
    onOpenWorkspace,
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
  const efforts: Array<{ id: ChatEffort; label: string; bars: number }> = [
    { id: "low", label: labels.effortLow, bars: 1 },
    { id: "medium", label: labels.effortMedium, bars: 2 },
    { id: "high", label: labels.effortHigh, bars: 3 },
  ];
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [effortIndex, setEffortIndex] = React.useState(1);
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
  const offlineLabel = locale === "ru" ? "Нет сети. Черновик сохранён на устройстве." : "You are offline. The draft is saved on this device.";
  const settingsLabel = locale === "ru" ? "Модель, режим и параметры" : "Model, mode, and settings";
  const groupedModels = React.useMemo(() => {
    const groups = new Map<string, ChatInputModel[]>();
    for (const model of models) groups.set(model.tierLabel, [...(groups.get(model.tierLabel) ?? []), model]);
    return [...groups.entries()];
  }, [models]);

  React.useEffect(() => {
    attachmentsRef.current = attachments;
    onAttachmentsChange?.(attachments);
  }, [attachments, onAttachmentsChange]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  React.useEffect(() => () => {
    recognitionRef.current?.stop();
    attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url));
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
    const accepted = onSubmit(value.trim(), { model: selectedModel.id, effort: effort.id, attachments: attachments.map(({ name, content }) => ({ name, content })) });
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
    let rejected = candidates.length > room;
    let contextLength = attachments.reduce((total, attachment) => total + Array.from(`[${attachment.name}]\n${attachment.content}`).length + 2, 0);
    const next: ChatInputAttachment[] = [];
    for (const file of candidates.slice(0, room)) {
      if (file.size > maxAttachmentBytes || !(file.type.startsWith("text/") || /\.(md|txt)$/i.test(file.name))) { rejected = true; continue; }
      const content = await file.text();
      const additionLength = Array.from(`[${file.name.trim()}]\n${content.trim()}`).length + 2;
      if (!file.name.trim() || Array.from(file.name.trim()).length > 120 || !content.trim() || new TextEncoder().encode(content).byteLength > maxAttachmentBytes || contextLength + additionLength > maxAttachmentContextLength) { rejected = true; continue; }
      next.push({ id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`, file, name: file.name, content, url: URL.createObjectURL(file) });
      contextLength += additionLength;
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
    setIsRecording(false);
  }

  function startRecording() {
    if (busy || disabled) return;
    setVoiceError("");
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoiceError(labels.voiceUnsupported); return; }
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
    recognition.onerror = () => { setVoiceError(labels.voiceDenied); setIsRecording(false); };
    recognition.onend = () => { recognitionRef.current = null; setIsRecording(false); };
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
      {attachmentsEnabled && <input ref={fileInputRef} className="sr-only" type="file" accept="text/plain,text/markdown,.txt,.md" multiple aria-label={labels.addAttachment} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />}

      <div className="overflow-hidden rounded-[1.35rem] border border-outline-variant bg-surface-container-lowest shadow-[0_8px_28px_color-mix(in_srgb,var(--color-primary)_6%,transparent)] focus-within:border-primary sm:rounded-[1.5rem]">
        {attachments.length > 0 && (
          <div className="hidden gap-2 overflow-x-auto border-b border-outline-variant px-3 py-3 sm:flex">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="group relative flex h-11 max-w-[180px] shrink-0 items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 pr-9">
                <button type="button" className="flex min-w-0 items-center gap-2 text-left text-[11px] text-on-surface-variant" onClick={() => setActiveAttachment(attachment)} aria-label={`${labels.openAttachment} ${attachment.name}`}><FileText size={15} className="shrink-0" /><span className="truncate">{attachment.name}</span></button>
                <button type="button" className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container hover:text-primary" onClick={() => removeAttachment(attachment.id)} aria-label={`${labels.close} ${attachment.name}`}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1 px-2 pb-2 pt-1 sm:block sm:px-0 sm:pb-0 sm:pt-0">
          <button type="button" className="relative grid size-10 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary sm:hidden" onClick={() => setSettingsOpen(true)} aria-expanded={settingsOpen} aria-haspopup="dialog" aria-label={settingsLabel}>
            <Plus size={18} />
            {attachments.length > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-primary text-[9px] text-on-primary">{attachments.length}</span>}
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
            onKeyDown={(event) => {
              const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;
              const desktopEnter = window.matchMedia("(pointer: fine) and (min-width: 768px)").matches;
              if (event.key === "Enter" && !event.shiftKey && !isComposing && desktopEnter) { event.preventDefault(); submit(); }
              if (event.key === "Escape" && settingsOpen) { event.preventDefault(); setSettingsOpen(false); }
            }}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            enterKeyHint="enter"
            className="block min-h-11 max-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-[15px] leading-6 text-primary outline-none placeholder:text-on-secondary-container disabled:opacity-60 sm:w-full sm:px-4 sm:pb-2 sm:pt-3 sm:leading-7"
            aria-label={labels.request}
          />

          <div className="flex shrink-0 items-center gap-1 sm:hidden">
            <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30" onClick={isRecording ? stopRecording : startRecording} disabled={disabled || busy} aria-label={isRecording ? labels.stopRecording : labels.voiceInput} aria-pressed={isRecording}>{isRecording ? <Square size={13} fill="currentColor" /> : <Mic size={17} />}</button>
            <button type="button" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-on-primary shadow-sm hover:opacity-85 disabled:opacity-25" onClick={() => { if (busy) onStop?.(); else submit(); }} disabled={disabled || (busy ? !onStop : !canSubmit)} aria-label={busy ? labels.stopGeneration : labels.send}>{busy ? <Square size={13} fill="currentColor" /> : <ArrowUp size={17} />}</button>
          </div>
        </div>

        {isRecording && <div className="px-4 pb-2 text-[11px] font-medium text-primary" role="status">{labels.listening}</div>}
        {!isOnline && <div className="flex items-center gap-2 px-4 pb-2 text-[11px] text-error" role="status"><WifiOff size={13} aria-hidden="true" /> {offlineLabel}</div>}

        <div className="hidden min-w-0 items-center gap-2 px-2 pb-2 sm:flex">
          <button type="button" className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-2.5 text-left text-[12px] font-medium text-on-surface-variant hover:bg-surface-container hover:text-primary sm:max-w-[280px]" onClick={() => setSettingsOpen(true)} aria-expanded={settingsOpen} aria-haspopup="listbox" title={selectedModel?.name ?? labels.model}><ModelMark model={selectedModel} /><span className="min-w-0 flex-1 truncate">{selectedModel?.name ?? labels.model}</span><ChevronDown size={13} className="shrink-0" /></button>
          <button type="button" className="flex size-10 shrink-0 items-center justify-center gap-1 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary md:w-auto md:px-3" onClick={() => setEffortIndex((index) => (index + 1) % efforts.length)} title={`${labels.effort}: ${effort.label}`} aria-label={`${labels.effort}: ${effort.label}`}><EffortBars count={effort.bars} /><span className="hidden text-[11px] md:inline">{effort.label}</span></button>
          {attachmentsEnabled && <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30" onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= 3 || disabled} aria-label={labels.addAttachment}><Plus size={16} /></button>}
          {onOpenWorkspace && <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary" onClick={onOpenWorkspace} aria-label={settingsLabel}><SlidersHorizontal size={16} /></button>}
          <button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30" onClick={isRecording ? stopRecording : startRecording} disabled={disabled || busy} aria-label={isRecording ? labels.stopRecording : labels.voiceInput} aria-pressed={isRecording}>{isRecording ? <Square size={13} fill="currentColor" /> : <Mic size={16} />}</button>
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-on-primary shadow-sm hover:opacity-85 disabled:opacity-25" onClick={() => { if (busy) onStop?.(); else submit(); }} disabled={disabled || (busy ? !onStop : !canSubmit)} aria-label={busy ? labels.stopGeneration : labels.send}>{busy ? <Square size={13} fill="currentColor" /> : <ArrowUp size={17} />}</button>
        </div>
      </div>

      {voiceError && <div className="mt-2 px-1 text-[11px] text-error" role="status">{voiceError}</div>}
      {attachmentError && <div className="mt-2 px-1 text-[11px] text-error" role="status">{attachmentError}</div>}

      <ChatOverlay open={settingsOpen} onClose={() => setSettingsOpen(false)} labelledBy="chat-model-picker-title" position="responsive" className="p-3" closeLabel={labels.close}>
        <div>
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-outline-variant px-2 pb-3">
            <div><p className="label-caps text-on-secondary-container">AI CHAT</p><h2 id="chat-model-picker-title" className="mt-1 text-lg font-medium text-primary">{settingsLabel}</h2></div>
            <button type="button" onClick={() => setSettingsOpen(false)} className="grid size-10 place-items-center rounded-full text-primary hover:bg-surface-container-low" aria-label={labels.close}><X size={16} /></button>
          </div>

          <section className="border-b border-outline-variant px-2 pb-4">
            <p className="label-caps mb-2 text-on-secondary-container">{locale === "ru" ? "Режим ответа" : "Response mode"}</p>
            <div className="grid grid-cols-2 gap-2">
              {CHAT_RESPONSE_MODES.map((mode) => <button key={mode} type="button" onClick={() => onResponseModeChange?.(mode)} aria-pressed={responseMode === mode} className={cn("min-h-11 rounded-xl border px-3 text-left text-[11px]", responseMode === mode ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface")}>{chatResponseModeLabel(mode, locale)}</button>)}
            </div>
          </section>

          <section className="border-b border-outline-variant px-2 py-4">
            <p className="label-caps mb-2 text-on-secondary-container">{labels.effort}</p>
            <div className="grid grid-cols-3 gap-2">
              {efforts.map((entry, index) => <button key={entry.id} type="button" onClick={() => setEffortIndex(index)} aria-pressed={effortIndex === index} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl border text-[11px]", effortIndex === index ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface")}><EffortBars count={entry.bars} /> {entry.label}</button>)}
            </div>
            <label className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface px-3 text-[12px] text-primary">
              {locale === "ru" ? "Глубокое рассуждение" : "Deep reasoning"}
              <input type="checkbox" checked={reasonEnabled} onChange={(event) => onReasonEnabledChange?.(event.target.checked)} className="size-5 accent-current" />
            </label>
          </section>

          {attachmentsEnabled && (
            <section className="border-b border-outline-variant px-2 py-4">
              <div className="mb-2 flex items-center justify-between gap-3"><p className="label-caps text-on-secondary-container">{locale === "ru" ? "Прикреплённые файлы" : "Attached files"}</p><button type="button" onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= 3 || disabled} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-surface-container-low px-3 text-xs font-medium text-primary hover:bg-surface-container disabled:opacity-30" aria-label={labels.addAttachment} title={labels.addAttachment}><FileText size={15} /><Plus size={13} /></button></div>
              {attachments.length ? <div className="space-y-2">{attachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface p-2"><button type="button" onClick={() => setActiveAttachment(attachment)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[12px] text-primary"><FileText size={15} /><span className="truncate">{attachment.name}</span></button><button type="button" onClick={() => removeAttachment(attachment.id)} className="grid size-9 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container" aria-label={`${labels.close} ${attachment.name}`}><X size={14} /></button></div>)}</div> : <p className="rounded-xl bg-surface-container-low p-3 text-[12px] text-on-secondary-container">{locale === "ru" ? "Файлы не прикреплены." : "No files attached."}</p>}
            </section>
          )}

          <div role="listbox" aria-label={labels.model} className="px-2 pt-4">
            <p className="label-caps mb-2 text-on-secondary-container">{labels.model}</p>
            {groupedModels.map(([tier, tierModels]) => (
              <div className="border-b border-outline-variant py-2 last:border-0" key={tier}>
                <p className="label-caps px-2 pb-2 text-on-secondary-container">{tier}</p>
                {tierModels.map((model) => <button key={model.id} type="button" disabled={!model.available} className={cn("my-1 flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] hover:bg-surface-container-low disabled:opacity-35", selectedModelId === model.id && "bg-surface-container-low text-primary")} role="option" aria-selected={selectedModelId === model.id} onClick={() => onModelChange(model.id)}><ModelMark model={model} active={selectedModelId === model.id} /><span className="min-w-0 flex-1 truncate">{model.name}</span>{model.status && <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">{model.status}</span>}</button>)}
              </div>
            ))}
          </div>
        </div>
      </ChatOverlay>

      <ChatOverlay open={Boolean(activeAttachment)} onClose={() => setActiveAttachment(null)} labelledBy="attachment-preview-title" className="p-0" closeLabel={labels.close}>
        {activeAttachment && <><div className="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4"><p id="attachment-preview-title" className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary"><FileText size={16} /> <span className="truncate">{activeAttachment.name}</span></p><button type="button" className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-surface-container-low" onClick={() => setActiveAttachment(null)} aria-label={labels.close}><X size={17} /></button></div><pre className="max-h-[68dvh] overflow-auto whitespace-pre-wrap px-5 py-5 text-left text-[13px] leading-[1.7] text-primary">{activeAttachment.content}</pre></>}
      </ChatOverlay>

      <span className="sr-only"><Gauge /> {labels.effort}: {effort.label}</span>
    </div>
  );
});

PromptInput.displayName = "PromptInput";
