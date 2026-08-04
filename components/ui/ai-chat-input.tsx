"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronDown, FileText, Loader2, Mic, MicOff, Paperclip, Send, X } from "lucide-react";

export type ChatModelOption = {
  id: string;
  name: string;
  status: string;
  available: boolean;
  tierLabel?: string;
};

export type ChatSubmitMeta = {
  model: string;
  effort: "low" | "medium" | "high";
  attachments: ChatAttachment[];
};

export type ChatAttachment = {
  name: string;
  content: string;
};

type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type BrowserSpeechRecognitionEvent = {
  results: { length: number; [index: number]: BrowserSpeechRecognitionResult };
};

type BrowserSpeechRecognitionError = { error?: string };

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionError) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export interface AIChatInputProps {
  defaultValue?: string;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  models: ChatModelOption[];
  modelImageSrc?: string;
  effortLabels: string[];
  labels: {
    send: string;
    addFile: string;
    removeFile: string;
    model: string;
    effort: string;
    modelMenu: string;
    comingSoon: string;
    voice: string;
    voiceInput: string;
    voiceStopInput: string;
    voiceListening: string;
    voiceUnsupported: string;
    voiceDenied: string;
  };
  voiceLanguage: string;
  onSubmit: (value: string, meta: ChatSubmitMeta) => void;
}

function AttachmentPreview() {
  return <FileText size={16} aria-hidden="true" />;
}

export const AIChatInput = React.forwardRef<HTMLDivElement, AIChatInputProps>(function AIChatInput(
  { defaultValue = "", placeholder, ariaLabel, disabled = false, models, modelImageSrc, effortLabels, labels, voiceLanguage, onSubmit },
  ref,
) {
  const [value, setValue] = React.useState(defaultValue);
  const [attachments, setAttachments] = React.useState<ChatAttachment[]>([]);
  const [selectedModelId, setSelectedModelId] = React.useState(models[0]?.id ?? "erma-spark-lite");
  const [effortIndex, setEffortIndex] = React.useState(Math.min(1, Math.max(0, effortLabels.length - 1)));
  const [isModelMenuOpen, setIsModelMenuOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(Boolean(defaultValue));
  const [isListening, setIsListening] = React.useState(false);
  const [voiceNotice, setVoiceNotice] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const recognitionRef = React.useRef<BrowserSpeechRecognition | null>(null);
  const recognitionBaseRef = React.useRef("");
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0];
  const isExpanded = isFocused || isModelMenuOpen || isListening || value.length > 0 || attachments.length > 0;

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startListening = () => {
    if (disabled) return;
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setVoiceNotice(labels.voiceUnsupported);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLanguage;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionBaseRef.current = value.trim();
      recognition.onresult = (event) => {
        let transcript = "";
        for (let index = 0; index < event.results.length; index += 1) {
          transcript += event.results[index]?.[0]?.transcript ?? "";
        }
        const base = recognitionBaseRef.current;
        setValue([base, transcript.trim()].filter(Boolean).join(base ? " " : ""));
        setIsFocused(true);
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        setVoiceNotice(event.error === "not-allowed" || event.error === "service-not-allowed" ? labels.voiceDenied : labels.voiceUnsupported);
      };
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      setVoiceNotice("");
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice(labels.voiceUnsupported);
    }
  };


  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = "";
    const readableFiles = incoming.filter((file) => file.size <= 64 * 1024 && (file.type.startsWith("text/") || /\.(md|txt)$/i.test(file.name)));
    const loaded = await Promise.all(readableFiles.slice(0, 6).map(async (file) => ({ name: file.name, content: (await file.text()).slice(0, 8_000) })));
    if (loaded.length) setAttachments((current) => [...current, ...loaded].slice(0, 6));
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || !selectedModel) return;
    const effort: ChatSubmitMeta["effort"] = effortIndex <= 0 ? "low" : effortIndex >= 2 ? "high" : "medium";
    onSubmit(trimmed, {
      model: selectedModel.id,
      effort,
      attachments,
    });
    setValue("");
    setAttachments([]);
    textareaRef.current?.focus();
  };

  return (
    <div
      ref={ref}
      className={"ai-chat-input " + (isExpanded ? "is-expanded " : "") + (disabled ? "is-disabled" : "")}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !value && !attachments.length) {
          setIsFocused(false);
          setIsModelMenuOpen(false);
        }
      }}
    >
      {attachments.length > 0 && (
        <div className="ai-chat-attachments" aria-label={labels.addFile}>
          {attachments.map((file, index) => (
            <div className="ai-chat-attachment" key={file.name + "-" + String(index)}>
              <span className="ai-attachment-preview"><AttachmentPreview /></span>
              <span className="ai-attachment-name">{file.name}</span>
              <button type="button" onClick={() => setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={labels.removeFile + ": " + file.name}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
          }
          if (event.key === "Escape" && !value && !attachments.length) {
            setIsFocused(false);
            setIsModelMenuOpen(false);
            textareaRef.current?.blur();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        rows={isExpanded ? 3 : 1}
      />

      <div className="ai-chat-input-toolbar">
        <div className="ai-chat-input-controls">
          <div className="ai-chat-model-picker">
            <button type="button" className="ai-chat-control-button" onClick={() => setIsModelMenuOpen((open) => !open)} aria-expanded={isModelMenuOpen} aria-label={labels.modelMenu}>
              <span className="ai-model-glyph">
                {modelImageSrc ? <Image src={modelImageSrc} alt="" width={16} height={16} unoptimized /> : "✦"}
              </span>
              <span>{selectedModel?.name ?? labels.model}</span>
              <ChevronDown size={13} />
            </button>
            {isModelMenuOpen && (
              <div className="ai-chat-model-menu" role="menu" aria-label={labels.modelMenu}>
                <div className="ai-model-menu-label">{labels.modelMenu}</div>
                {models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    role="menuitem"
                    disabled={!model.available}
                    className={model.id === selectedModelId ? "is-selected" : ""}
                    onClick={() => {
                      if (model.available) {
                        setSelectedModelId(model.id);
                        setIsModelMenuOpen(false);
                        textareaRef.current?.focus();
                      }
                    }}
                  >
                    <span>
                      <span className="ai-model-glyph">{modelImageSrc ? <Image src={modelImageSrc} alt="" width={16} height={16} unoptimized /> : "✦"}</span>
                      <span>{model.name}</span>
                    </span>
                    <small>{model.tierLabel ? model.tierLabel + " · " : ""}{model.available ? model.status : labels.comingSoon}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="ai-chat-control-button ai-chat-effort-button" onClick={() => setEffortIndex((index) => (index + 1) % Math.max(1, effortLabels.length))} aria-label={labels.effort + ": " + effortLabels[effortIndex]}>
            <span className="ai-effort-bars" data-level={String(effortIndex)}><i /><i /><i /></span>
            <span>{effortLabels[effortIndex]}</span>
          </button>

          <button type="button" className="ai-chat-icon-button" onClick={() => fileInputRef.current?.click()} aria-label={labels.addFile}>
            <Paperclip size={15} />
          </button>
          <button
            type="button"
            className={"ai-chat-icon-button ai-chat-mic-button" + (isListening ? " is-listening" : "")}
            onClick={startListening}
            disabled={disabled}
            aria-pressed={isListening}
            aria-label={isListening ? labels.voiceStopInput : labels.voiceInput}
            title={isListening ? labels.voiceStopInput : labels.voiceInput}
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
          <input ref={fileInputRef} className="sr-only" type="file" multiple accept="text/plain,text/markdown,.txt,.md" onChange={(event) => void handleFiles(event)} />
        </div>

        <button type="button" className="ai-chat-send-button" disabled={!value.trim() || disabled} onClick={handleSubmit} aria-label={labels.send}>
          {disabled ? <Loader2 size={15} className="ai-spin" /> : <Send size={15} />}
        </button>
      </div>
      {(isListening || voiceNotice) && (
        <div className={"ai-chat-voice-notice" + (isListening ? " is-listening" : "")} role="status" aria-live="polite">
          <Mic size={12} />
          <span>{isListening ? labels.voiceListening : voiceNotice}</span>
        </div>
      )}
    </div>
  );
});

AIChatInput.displayName = "AIChatInput";
