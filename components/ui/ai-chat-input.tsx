"use client";

import * as React from "react";
import { ChevronDown, FileText, Loader2, Paperclip, Send, X } from "lucide-react";

export type ChatModelOption = {
  id: string;
  name: string;
  status: string;
  available: boolean;
  tierLabel?: string;
};

export type ChatSubmitMeta = {
  model: string;
  effort: string;
  attachments: File[];
};

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
  };
  onSubmit: (value: string, meta: ChatSubmitMeta) => void;
}

function AttachmentPreview({ file }: { file: File }) {
  const imageRef = React.useRef<HTMLImageElement>(null);
  const isImage = file.type.startsWith("image/");

  React.useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return isImage ? <img ref={imageRef} alt="" /> : <FileText size={16} aria-hidden="true" />;
}

export const AIChatInput = React.forwardRef<HTMLDivElement, AIChatInputProps>(function AIChatInput(
  { defaultValue = "", placeholder, ariaLabel, disabled = false, models, modelImageSrc, effortLabels, labels, onSubmit },
  ref,
) {
  const [value, setValue] = React.useState(defaultValue);
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [selectedModelId, setSelectedModelId] = React.useState(models[0]?.id ?? "erma-spark-lite");
  const [effortIndex, setEffortIndex] = React.useState(Math.min(1, Math.max(0, effortLabels.length - 1)));
  const [isModelMenuOpen, setIsModelMenuOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(Boolean(defaultValue));
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0];
  const isExpanded = isFocused || isModelMenuOpen || value.length > 0 || attachments.length > 0;


  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length) setAttachments((current) => [...current, ...incoming].slice(0, 6));
    event.target.value = "";
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || !selectedModel) return;
    onSubmit(trimmed, {
      model: selectedModel.id,
      effort: effortLabels[effortIndex] ?? effortLabels[0] ?? "balanced",
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
              <span className="ai-attachment-preview"><AttachmentPreview file={file} /></span>
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
                {modelImageSrc ? <img src={modelImageSrc} alt="" /> : "✦"}
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
                      <span className="ai-model-glyph">{modelImageSrc ? <img src={modelImageSrc} alt="" /> : "✦"}</span>
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
          <input ref={fileInputRef} className="sr-only" type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleFiles} />
        </div>

        <button type="button" className="ai-chat-send-button" disabled={!value.trim() || disabled} onClick={handleSubmit} aria-label={labels.send}>
          {disabled ? <Loader2 size={15} className="ai-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
});

AIChatInput.displayName = "AIChatInput";
