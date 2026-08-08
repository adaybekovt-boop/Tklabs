"use client";

/* eslint-disable react-hooks/set-state-in-effect -- browser network state hydrates after mount. */

import * as React from "react";
import { ArrowUp, ChevronDown, FileText, Mic, Plus, SlidersHorizontal, Square, WifiOff, X } from "lucide-react";

import { ChatOverlay } from "@/components/playground/ChatOverlay";
import {
  PromptInput,
  type ChatEffort,
  type ChatInputAttachment,
  type ChatInputModel,
  type PromptInputProps,
} from "@/components/ui/ai-chat-input";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";
import { CHAT_RESPONSE_MODES, chatResponseModeLabel, type ChatResponseMode } from "@/lib/chat-modes";
import { DOCUMENT_ACCEPT, extractDocumentFile } from "@/lib/documents/extract";
import { cn } from "@/lib/utils";
import { requestWorkspaceSection } from "@/lib/workspace-events";

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

type QuickCommand = {
  id: "flow" | "plan" | "document" | "code" | "search";
  label: string;
  description: string;
  mode?: ChatResponseMode;
  prompt?: string;
};

function ModelRow({ model, selected, onSelect }: { model: ChatInputModel; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" disabled={!model.available} role="option" aria-selected={selected} onClick={onSelect} className={cn("my-1 flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm disabled:opacity-35", selected ? "bg-surface-container-low text-primary" : "text-on-surface-variant hover:bg-surface-container-low")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl border text-xs font-semibold", selected ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface")}>{model.name.slice(0, 1)}</span>
      <span className="min-w-0 flex-1 truncate">{model.name}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">{model.tierLabel}</span>
    </button>
  );
}

const MobileChatComposer = React.forwardRef<HTMLDivElement, PromptInputProps>(function MobileChatComposer(
  { value, onChange, onSubmit, models, selectedModelId, onModelChange, responseMode = "normal", onResponseModeChange, reasonEnabled = false, onReasonEnabledChange, onAttachmentsChange, onOpenWorkspace, disabled = false, busy = false, onStop, placeholder = "", maxLength = 180, attachmentsEnabled = false, labels, voiceLanguage, maxAttachmentBytes = 16 * 1024, maxAttachmentContextLength = 8_000, className },
  forwardedRef,
) {
  const locale = voiceLanguage.toLowerCase().startsWith("ru") ? "ru" : "en";
  const efforts: Array<{ id: ChatEffort; label: string }> = [
    { id: "low", label: labels.effortLow }, { id: "medium", label: labels.effortMedium }, { id: "high", label: labels.effortHigh },
  ];
  const quickCommands: QuickCommand[] = locale === "ru"
    ? [
        { id: "flow", label: "/flow", description: "Открыть управляемую многошаговую задачу" },
        { id: "plan", label: "/plan", description: "Составить структурированный план", mode: "analysis", prompt: "Составь пошаговый план: " },
        { id: "document", label: "/document", description: "Подготовить цельный документ", mode: "document", prompt: "Подготовь профессиональный документ: " },
        { id: "code", label: "/code", description: "Перейти в режим кода", mode: "code", prompt: "Реши задачу и подготовь качественный код: " },
        { id: "search", label: "/search", description: "Ответ с поисковым режимом", mode: "search", prompt: "Найди и систематизируй информацию: " },
      ]
    : [
        { id: "flow", label: "/flow", description: "Open a controlled multi-step task" },
        { id: "plan", label: "/plan", description: "Create a structured plan", mode: "analysis", prompt: "Create a step-by-step plan: " },
        { id: "document", label: "/document", description: "Prepare a complete document", mode: "document", prompt: "Prepare a professional document: " },
        { id: "code", label: "/code", description: "Switch to code mode", mode: "code", prompt: "Solve the task and prepare production-quality code: " },
        { id: "search", label: "/search", description: "Use search response mode", mode: "search", prompt: "Find and organize the relevant information: " },
      ];

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [effort, setEffort] = React.useState<ChatEffort>("medium");
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
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0];
  const canSubmit = Boolean(value.trim()) && value.length <= maxLength && !disabled && !busy && !recording && online;
  const groupedModels = React.useMemo(() => {
    const groups = new Map<string, ChatInputModel[]>();
    for (const model of models) groups.set(model.tierLabel, [...(groups.get(model.tierLabel) ?? []), model]);
    return [...groups.entries()];
  }, [models]);
  const commandQuery = value.trim().toLowerCase();
  const visibleCommands = commandQuery.startsWith("/") && !commandQuery.includes(" ") ? quickCommands.filter((command) => command.label.startsWith(commandQuery)) : [];

  React.useEffect(() => { attachmentsRef.current = attachments; onAttachmentsChange?.(attachments); }, [attachments, onAttachmentsChange]);
  React.useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true); const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline); window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);
  React.useEffect(() => () => { recognitionRef.current?.stop(); attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url)); }, []);
  React.useEffect(() => { const textarea = textareaRef.current; if (!textarea) return; textarea.style.height = "0px"; textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), 176)}px`; }, [value]);

  function applyCommand(command: QuickCommand) { if (command.id === "flow") { onChange(""); requestWorkspaceSection("flow"); return; } if (command.mode) onResponseModeChange?.(command.mode); onChange(command.prompt ?? ""); requestAnimationFrame(() => textareaRef.current?.focus()); }
  function submit() { if (!canSubmit || !selectedModel) return; const accepted = onSubmit(value.trim(), { model: selectedModel.id, effort, attachments: attachments.map(({ name, content }) => ({ name, content })) }); if (accepted === false) return; onChange(""); attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url)); setAttachments([]); setVoiceError(""); setAttachmentError(""); }

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setAttachmentError("");
    const room = Math.max(0, 3 - attachments.length);
    const candidates = Array.from(files);
    let rejected = candidates.length > room;
    let contextLength = attachments.reduce((total, attachment) => total + Array.from(`[${attachment.name}]\n${attachment.content}`).length + 2, 0);
    const next: ChatInputAttachment[] = [];
    for (const file of candidates.slice(0, room)) {
      try {
        const extracted = await extractDocumentFile(file, { maxSourceBytes: 2 * 1024 * 1024, maxOutputBytes: maxAttachmentBytes, maxCharacters: maxAttachmentContextLength });
        const additionLength = Array.from(`[${extracted.name}]\n${extracted.content}`).length + 2;
        if (contextLength + additionLength > maxAttachmentContextLength) { rejected = true; continue; }
        next.push({ id: `${extracted.name}-${file.lastModified}-${crypto.randomUUID()}`, file, name: extracted.name, content: extracted.content, url: URL.createObjectURL(file) });
        contextLength += additionLength;
      } catch { rejected = true; }
    }
    if (rejected) setAttachmentError(labels.attachmentTooLarge);
    setAttachments((current) => [...current, ...next]);
  }

  function removeAttachment(id: string) { setAttachments((current) => { const target = current.find((attachment) => attachment.id === id); if (target) URL.revokeObjectURL(target.url); return current.filter((attachment) => attachment.id !== id); }); }
  function stopRecording() { recognitionRef.current?.stop(); recognitionRef.current = null; setRecording(false); }
  function startRecording() {
    if (busy || disabled) return;
    setVoiceError("");
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoiceError(labels.voiceUnsupported); return; }
    const recognition = new Recognition(); recognition.continuous = true; recognition.interimResults = true; recognition.lang = voiceLanguage; transcriptBaseRef.current = value.trim();
    recognition.onresult = (event) => { let finalText = ""; let interimText = ""; for (let index = event.resultIndex; index < event.results.length; index += 1) { const result = event.results[index]; if (result.isFinal) finalText += result[0].transcript; else interimText += result[0].transcript; } const spoken = `${finalText}${interimText}`.trim(); const prefix = transcriptBaseRef.current; onChange(`${prefix}${prefix && spoken ? " " : ""}${spoken}`.slice(0, maxLength)); if (finalText.trim()) transcriptBaseRef.current = `${prefix}${prefix ? " " : ""}${finalText.trim()}`; };
    recognition.onerror = () => { setVoiceError(labels.voiceDenied); setRecording(false); }; recognition.onend = () => { recognitionRef.current = null; setRecording(false); }; recognitionRef.current = recognition; setRecording(true);
    try { recognition.start(); } catch { recognitionRef.current = null; setRecording(false); setVoiceError(labels.voiceDenied); }
  }
  function handlePrimaryAction() { if (busy) { onStop?.(); return; } if (recording) { stopRecording(); return; } if (value.trim()) { submit(); return; } startRecording(); }
  const primaryLabel = busy ? labels.stopGeneration : recording ? labels.stopRecording : value.trim() ? labels.send : labels.voiceInput;
  const primaryDisabled = disabled || (busy ? !onStop : recording ? false : value.trim() ? !canSubmit : !online);

  return (
    <div ref={forwardedRef} data-testid="mobile-prompt-input" className={cn("relative mx-auto w-full max-w-[780px]", className)}>
      {visibleCommands.length > 0 && <div className="motion-command-menu absolute bottom-[calc(100%+10px)] left-0 right-0 z-20 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-2 shadow-2xl" role="listbox" aria-label={locale === "ru" ? "Быстрые команды" : "Quick commands"}>{visibleCommands.map((command) => <button key={command.id} type="button" role="option" onClick={() => applyCommand(command)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-container-low"><span className="min-w-[78px] font-mono text-xs font-semibold text-primary">{command.label}</span><span className="text-xs leading-5 text-on-secondary-container">{command.description}</span></button>)}</div>}
      {attachmentsEnabled && <input ref={fileInputRef} className="sr-only" type="file" accept={DOCUMENT_ACCEPT} multiple aria-label={labels.addAttachment} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />}
      <div className="overflow-hidden rounded-[1.55rem] border border-outline-variant bg-surface-container-lowest shadow-[0_10px_30px_color-mix(in_srgb,var(--color-primary)_8%,transparent)] focus-within:border-primary">
        <div className="flex items-center gap-2 px-3 pb-1 pt-2.5"><button type="button" onClick={() => setSettingsOpen(true)} className="flex min-h-9 min-w-0 items-center gap-2 rounded-full bg-surface-container-low px-3 text-left text-[11px] font-medium text-primary" aria-expanded={settingsOpen} aria-haspopup="dialog"><span className="truncate">{selectedModel?.name ?? labels.model}</span><ChevronDown size={13} className="shrink-0" /></button><button type="button" onClick={() => setSettingsOpen(true)} className="min-h-9 shrink-0 rounded-full px-3 text-[11px] text-on-secondary-container hover:bg-surface-container-low">{chatResponseModeLabel(responseMode, locale)}</button><button type="button" onClick={() => setSettingsOpen(true)} className="ml-auto grid size-9 shrink-0 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container-low hover:text-primary" aria-label={locale === "ru" ? "Настройки ответа" : "Response settings"}><SlidersHorizontal size={16} /></button></div>
        {attachments.length > 0 && <div className="flex gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{attachments.map((attachment) => <div key={attachment.id} className="relative flex h-11 max-w-[190px] shrink-0 items-center gap-2 rounded-xl border border-outline-variant bg-surface px-3 pr-9"><button type="button" onClick={() => setActiveAttachment(attachment)} className="flex min-w-0 items-center gap-2 text-left text-[11px] text-on-surface-variant" aria-label={`${labels.openAttachment} ${attachment.name}`}><FileText size={15} className="shrink-0" /><span className="truncate">{attachment.name}</span></button><button type="button" onClick={() => removeAttachment(attachment.id)} className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container" aria-label={`${labels.close} ${attachment.name}`}><X size={13} /></button></div>)}</div>}
        <div className="flex items-end gap-1 px-2 pb-2 pt-1"><button type="button" onClick={() => attachmentsEnabled ? fileInputRef.current?.click() : setSettingsOpen(true)} disabled={disabled || (attachmentsEnabled && attachments.length >= 3)} className="relative grid size-11 shrink-0 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary disabled:opacity-30" aria-label={attachmentsEnabled ? labels.addAttachment : labels.model}><Plus size={19} />{attachments.length > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-primary text-[9px] text-on-primary">{attachments.length}</span>}</button><textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value.slice(0, maxLength))} placeholder={placeholder} disabled={disabled} rows={1} enterKeyHint="enter" aria-label={labels.request} className="block min-h-11 max-h-44 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-[16px] leading-6 text-primary outline-none placeholder:text-on-secondary-container disabled:opacity-60" /><button type="button" onClick={handlePrimaryAction} disabled={primaryDisabled} className={cn("grid size-11 shrink-0 place-items-center rounded-full shadow-sm disabled:opacity-25", busy || value.trim() ? "bg-primary text-on-primary" : "bg-surface-container-low text-primary")} aria-label={primaryLabel}>{busy || recording ? <Square size={14} fill="currentColor" /> : value.trim() ? <ArrowUp size={18} /> : <Mic size={18} />}</button></div>
        {recording && <div className="px-4 pb-2 text-[11px] font-medium text-primary" role="status">{labels.listening}</div>}
        {!online && <div className="flex items-center gap-2 px-4 pb-2 text-[11px] text-error" role="status"><WifiOff size={13} />{locale === "ru" ? "Нет сети. Черновик сохранён." : "Offline. Draft saved."}</div>}
      </div>
      {voiceError && <p className="mt-2 px-2 text-[11px] text-error" role="status">{voiceError}</p>}{attachmentError && <p className="mt-2 px-2 text-[11px] text-error" role="status">{attachmentError}</p>}
      <ChatOverlay open={settingsOpen} onClose={() => setSettingsOpen(false)} labelledBy="mobile-chat-settings-title" position="sheet" className="p-3" closeLabel={labels.close}>
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-2 pb-3"><div><p className="label-caps text-on-secondary-container">AI CHAT</p><h2 id="mobile-chat-settings-title" className="mt-1 text-lg font-medium text-primary">{locale === "ru" ? "Модель и режим ответа" : "Model and response mode"}</h2></div><button type="button" onClick={() => setSettingsOpen(false)} className="grid size-11 place-items-center rounded-full text-primary hover:bg-surface-container-low" aria-label={labels.close}><X size={17} /></button></div>
        <section className="border-b border-outline-variant px-2 py-4"><p className="label-caps mb-2 text-on-secondary-container">{locale === "ru" ? "Режим ответа" : "Response mode"}</p><div className="grid grid-cols-2 gap-2">{CHAT_RESPONSE_MODES.map((mode) => <button key={mode} type="button" onClick={() => onResponseModeChange?.(mode)} aria-pressed={responseMode === mode} className={cn("min-h-11 rounded-xl border px-3 text-left text-[11px]", responseMode === mode ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface")}>{chatResponseModeLabel(mode, locale)}</button>)}</div></section>
        <section className="border-b border-outline-variant px-2 py-4"><p className="label-caps mb-2 text-on-secondary-container">{labels.effort}</p><div className="grid grid-cols-3 gap-2">{efforts.map((entry) => <button key={entry.id} type="button" onClick={() => setEffort(entry.id)} aria-pressed={effort === entry.id} className={cn("min-h-11 rounded-xl border text-[11px]", effort === entry.id ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface")}>{entry.label}</button>)}</div><label className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface px-3 text-[12px] text-primary">{locale === "ru" ? "Глубокое рассуждение" : "Deep reasoning"}<input type="checkbox" checked={reasonEnabled} onChange={(event) => onReasonEnabledChange?.(event.target.checked)} className="size-5 accent-current" /></label></section>
        <div role="listbox" aria-label={labels.model} className="px-2 py-4"><p className="label-caps mb-2 text-on-secondary-container">{labels.model}</p>{groupedModels.map(([tier, tierModels]) => <section key={tier} className="border-b border-outline-variant py-2 last:border-0"><p className="label-caps px-2 pb-2 text-on-secondary-container">{tier}</p>{tierModels.map((model) => <ModelRow key={model.id} model={model} selected={selectedModelId === model.id} onSelect={() => { onModelChange(model.id); setSettingsOpen(false); }} />)}</section>)}</div>
        {onOpenWorkspace && <button type="button" onClick={() => { setSettingsOpen(false); onOpenWorkspace(); }} className="mx-2 mb-2 flex min-h-11 w-auto items-center justify-center rounded-xl border border-outline-variant text-sm text-primary">{locale === "ru" ? "Контекст и файлы" : "Context and files"}</button>}
      </ChatOverlay>
      <ChatOverlay open={Boolean(activeAttachment)} onClose={() => setActiveAttachment(null)} labelledBy="mobile-attachment-preview-title" className="p-0" closeLabel={labels.close}>{activeAttachment && <><div className="flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4"><p id="mobile-attachment-preview-title" className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary"><FileText size={16} /><span className="truncate">{activeAttachment.name}</span></p><button type="button" className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-surface-container-low" onClick={() => setActiveAttachment(null)} aria-label={labels.close}><X size={17} /></button></div><pre className="max-h-[68dvh] overflow-auto whitespace-pre-wrap px-5 py-5 text-left text-[13px] leading-[1.7] text-primary">{activeAttachment.content}</pre></>}</ChatOverlay>
    </div>
  );
});
MobileChatComposer.displayName = "MobileChatComposer";
export const ResponsiveChatComposer = React.forwardRef<HTMLDivElement, PromptInputProps>(function ResponsiveChatComposer(props, ref) { const mobile = useMobileViewport(); return mobile ? <MobileChatComposer ref={ref} {...props} /> : <PromptInput ref={ref} {...props} />; });
ResponsiveChatComposer.displayName = "ResponsiveChatComposer";
