"use client";

import * as React from "react";
import { ArrowUp, Camera, FileText, ImageIcon, Mic, Plus, Square, Upload, WifiOff, X } from "lucide-react";

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
  kind: "document" | "image";
  mimeType?: string;
};

export type ChatInputSubmitAttachment = {
  name: string;
  content: string;
  type?: "document" | "image";
  mimeType?: string;
};

export type ChatInputSubmitMeta = {
  model: string;
  effort: ChatEffort;
  attachments: ChatInputSubmitAttachment[];
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

type AttachmentMenuPlacement = "above" | "below";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_IMAGE_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_DATA_BYTES = 900 * 1024;
const MAX_IMAGE_TOTAL_BYTES = 1_700 * 1024;
const MAX_IMAGE_COUNT = 2;
const MAX_IMAGE_DIMENSION = 1536;
const ATTACHMENT_MENU_GAP = 8;
const ATTACHMENT_MENU_FALLBACK_HEIGHT = 104;

function normalizeSpeechSegment(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function dedupeAdjacentSpeechSegments(segments: string[]) {
  const result: string[] = [];
  for (const segment of segments.map(normalizeSpeechSegment).filter(Boolean)) {
    const previous = result.at(-1)?.toLocaleLowerCase();
    if (previous === segment.toLocaleLowerCase()) continue;
    result.push(segment);
  }
  return result;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("image_read_failed"));
    reader.onerror = () => reject(new Error("image_read_failed"));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File) {
  if (!IMAGE_ACCEPT.split(",").includes(file.type) || file.size > MAX_IMAGE_SOURCE_BYTES) throw new Error("unsupported_image");
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("image_decode_failed"));
      node.src = sourceUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("image_canvas_failed");
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("image_encode_failed")), "image/jpeg", 0.84));
    const dataUrl = await blobToDataUrl(blob);
    if (new TextEncoder().encode(dataUrl).byteLength > MAX_IMAGE_DATA_BYTES) throw new Error("image_too_large");
    return { dataUrl, mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

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
  const [attachmentMenuOpen, setAttachmentMenuOpen] = React.useState(false);
  const [attachmentMenuPlacement, setAttachmentMenuPlacement] = React.useState<AttachmentMenuPlacement>("above");
  const [recording, setRecording] = React.useState(false);
  const [online, setOnline] = React.useState(true);
  const [voiceError, setVoiceError] = React.useState("");
  const [attachmentError, setAttachmentError] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const attachmentMenuRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const attachmentsRef = React.useRef<ChatInputAttachment[]>([]);
  const transcriptBaseRef = React.useRef("");
  const speechFinalByIndexRef = React.useRef(new Map<number, string>());
  const hasAttachment = attachments.length > 0;
  const canSubmit = Boolean(value.trim() || hasAttachment) && value.length <= maxLength && !disabled && !busy && !recording && online;

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

  React.useLayoutEffect(() => {
    if (!attachmentMenuOpen) return;

    let frame = 0;
    const updatePlacement = () => {
      const menu = attachmentMenuRef.current;
      if (!menu) return;
      const anchor = menu.offsetParent instanceof HTMLElement ? menu.offsetParent : menu.parentElement;
      if (!anchor) return;

      const anchorRect = anchor.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const menuHeight = Math.max(menuRect.height, menu.scrollHeight, ATTACHMENT_MENU_FALLBACK_HEIGHT);
      const visualViewport = window.visualViewport;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
      const availableAbove = anchorRect.top - viewportTop - ATTACHMENT_MENU_GAP;
      const availableBelow = viewportBottom - anchorRect.bottom - ATTACHMENT_MENU_GAP;
      const canFitAbove = anchorRect.top - ATTACHMENT_MENU_GAP - menuHeight >= viewportTop;
      const canFitBelow = anchorRect.bottom + ATTACHMENT_MENU_GAP + menuHeight <= viewportBottom;
      const placement: AttachmentMenuPlacement = canFitAbove
        ? "above"
        : canFitBelow
          ? "below"
          : availableAbove >= availableBelow
            ? "above"
            : "below";
      setAttachmentMenuPlacement((current) => current === placement ? current : placement);
    };

    const schedulePlacement = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePlacement);
    };

    updatePlacement();
    schedulePlacement();
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", schedulePlacement);
    visualViewport?.addEventListener("resize", schedulePlacement);
    visualViewport?.addEventListener("scroll", schedulePlacement);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedulePlacement);
      visualViewport?.removeEventListener("resize", schedulePlacement);
      visualViewport?.removeEventListener("scroll", schedulePlacement);
    };
  }, [attachmentMenuOpen]);

  function submit() {
    if (!canSubmit) return;
    const fallbackPrompt = attachments.some((attachment) => attachment.kind === "image")
      ? locale === "ru" ? "Проанализируй прикреплённое изображение." : "Analyze the attached image."
      : locale === "ru" ? "Проанализируй прикреплённый файл." : "Analyze the attached file.";
    const prompt = value.trim() || fallbackPrompt;
    const accepted = onSubmit(prompt, {
      model: selectedModelId || AUTO_ERMA_MODEL_KEY,
      effort: "medium",
      attachments: attachments.map(({ name, content, kind, mimeType }) => ({ name, content, type: kind, ...(mimeType ? { mimeType } : {}) })),
    });
    if (accepted === false) return;
    onChange("");
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url));
    setAttachments([]);
    setAttachmentMenuOpen(false);
    setVoiceError("");
    setAttachmentError("");
  }

  async function addFiles(files: FileList | File[] | null) {
    if (!files || !attachmentsEnabled) return;
    setAttachmentError("");
    const room = Math.max(0, 3 - attachments.length);
    const candidates = Array.from(files);
    let rejected = candidates.length > room;
    let contextLength = attachments.filter((attachment) => attachment.kind === "document").reduce((total, attachment) => total + Array.from(`[${attachment.name}]\n${attachment.content}`).length + 2, 0);
    let imageBytes = attachments.filter((attachment) => attachment.kind === "image").reduce((total, attachment) => total + new TextEncoder().encode(attachment.content).byteLength, 0);
    let imageCount = attachments.filter((attachment) => attachment.kind === "image").length;
    const next: ChatInputAttachment[] = [];

    for (const file of candidates.slice(0, room)) {
      try {
        if (IMAGE_ACCEPT.split(",").includes(file.type)) {
          if (imageCount >= MAX_IMAGE_COUNT) throw new Error("too_many_images");
          const image = await compressImage(file);
          const additionBytes = new TextEncoder().encode(image.dataUrl).byteLength;
          if (imageBytes + additionBytes > MAX_IMAGE_TOTAL_BYTES) throw new Error("images_too_large");
          next.push({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, file, name: file.name || "image.jpg", content: image.dataUrl, url: URL.createObjectURL(file), kind: "image", mimeType: image.mimeType });
          imageBytes += additionBytes;
          imageCount += 1;
          continue;
        }

        const extracted = await extractDocumentFile(file, {
          maxSourceBytes: 2 * 1024 * 1024,
          maxOutputBytes: maxAttachmentBytes,
          maxCharacters: maxAttachmentContextLength,
        });
        const additionLength = Array.from(`[${extracted.name}]\n${extracted.content}`).length + 2;
        if (contextLength + additionLength > maxAttachmentContextLength) throw new Error("document_context_too_large");
        next.push({ id: `${extracted.name}-${file.lastModified}-${crypto.randomUUID()}`, file, name: extracted.name, content: extracted.content, url: URL.createObjectURL(file), kind: "document" });
        contextLength += additionLength;
      } catch {
        rejected = true;
      }
    }

    if (rejected) setAttachmentError(labels.attachmentTooLarge);
    setAttachments((current) => [...current, ...next]);
    setAttachmentMenuOpen(false);
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
    speechFinalByIndexRef.current.clear();
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) speechFinalByIndexRef.current.set(index, normalizeSpeechSegment(result[0].transcript));
      }
      const finalSegments = dedupeAdjacentSpeechSegments([...speechFinalByIndexRef.current.entries()].sort(([a], [b]) => a - b).map(([, transcript]) => transcript));
      const interimSegments: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result.isFinal) interimSegments.push(result[0].transcript);
      }
      const spoken = [...finalSegments, ...dedupeAdjacentSpeechSegments(interimSegments)].join(" ").trim();
      const prefix = transcriptBaseRef.current;
      onChange(`${prefix}${prefix && spoken ? " " : ""}${spoken}`.slice(0, maxLength));
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
    if (value.trim() || hasAttachment) {
      submit();
      return;
    }
    startRecording();
  }

  const primaryLabel = busy
    ? labels.stopGeneration
    : recording
      ? labels.stopRecording
      : value.trim() || hasAttachment
        ? labels.send
        : labels.voiceInput;
  const primaryDisabled = disabled || (busy ? !onStop : recording ? false : value.trim() || hasAttachment ? !canSubmit : !online);

  return (
    <div ref={forwardedRef} data-testid="prompt-input" className={cn("relative mx-auto w-full max-w-[780px]", className)}>
      {attachmentsEnabled && (
        <>
          <input ref={fileInputRef} className="sr-only" type="file" accept={`${DOCUMENT_ACCEPT},${IMAGE_ACCEPT}`} multiple aria-label={labels.addAttachment} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
          <input ref={cameraInputRef} className="sr-only" type="file" accept={IMAGE_ACCEPT} capture="environment" aria-label={locale === "ru" ? "Сфотографировать" : "Take a photo"} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
        </>
      )}

      {attachmentMenuOpen && (
        <div
          ref={attachmentMenuRef}
          className={cn(
            "absolute left-0 z-40 w-52 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-xl",
            attachmentMenuPlacement === "above" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
          )}
          role="menu"
          data-placement={attachmentMenuPlacement}
        >
          <button type="button" role="menuitem" onClick={() => cameraInputRef.current?.click()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-primary hover:bg-surface-container-low"><Camera size={17} />{locale === "ru" ? "Камера" : "Camera"}</button>
          <button type="button" role="menuitem" onClick={() => fileInputRef.current?.click()} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-primary hover:bg-surface-container-low"><Upload size={17} />{locale === "ru" ? "Фото или файл" : "Photo or file"}</button>
        </div>
      )}

      <div className="overflow-hidden rounded-[1.55rem] border border-outline-variant bg-surface-container-lowest shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary)_7%,transparent)] focus-within:border-primary">
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative flex h-11 max-w-[210px] shrink-0 items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 pr-9">
                <button type="button" onClick={() => setActiveAttachment(attachment)} className="flex min-w-0 items-center gap-2 text-left text-[11px] text-on-surface-variant" aria-label={`${labels.openAttachment} ${attachment.name}`}>
                  {attachment.kind === "image" ? <ImageIcon size={15} className="shrink-0" /> : <FileText size={15} className="shrink-0" />}
                  <span className="truncate">{attachment.name}</span>
                </button>
                <button type="button" onClick={() => removeAttachment(attachment.id)} className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container" aria-label={`${labels.close} ${attachment.name}`}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1 px-2 pb-2 pt-2 sm:px-3">
          <button type="button" onClick={() => setAttachmentMenuOpen((open) => !open)} disabled={!attachmentsEnabled || disabled || attachments.length >= 3} className="relative grid size-11 shrink-0 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30" aria-label={labels.addAttachment} aria-expanded={attachmentMenuOpen}>
            <Plus size={19} />
            {attachments.length > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-primary text-[9px] text-on-primary">{attachments.length}</span>}
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
            onPaste={(event) => {
              const imageFiles = Array.from(event.clipboardData.files).filter((file) => IMAGE_ACCEPT.split(",").includes(file.type));
              if (!imageFiles.length) return;
              event.preventDefault();
              void addFiles(imageFiles);
            }}
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

          <button type="button" onClick={handlePrimaryAction} disabled={primaryDisabled} className={cn("grid size-11 shrink-0 place-items-center rounded-full shadow-sm disabled:opacity-25", busy || value.trim() || hasAttachment ? "bg-primary text-on-primary" : "bg-surface-container-low text-primary")} aria-label={primaryLabel}>
            {busy || recording ? <Square size={14} fill="currentColor" /> : value.trim() || hasAttachment ? <ArrowUp size={18} /> : <Mic size={18} />}
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
              <p id="attachment-preview-title" className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary">{activeAttachment.kind === "image" ? <ImageIcon size={16} /> : <FileText size={16} />}<span className="truncate">{activeAttachment.name}</span></p>
              <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-surface-container-low" onClick={() => setActiveAttachment(null)} aria-label={labels.close}><X size={17} /></button>
            </div>
            {activeAttachment.kind === "image" ? (
              <div className="flex max-h-[72dvh] items-center justify-center overflow-auto bg-black/5 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeAttachment.url} alt={activeAttachment.name} className="max-h-[68dvh] max-w-full rounded-xl object-contain" />
              </div>
            ) : <pre className="max-h-[68dvh] overflow-auto whitespace-pre-wrap px-5 py-5 text-left text-[13px] leading-[1.7] text-primary">{activeAttachment.content}</pre>}
          </>
        )}
      </ChatOverlay>
    </div>
  );
});

PromptInput.displayName = "PromptInput";