import { PRIVILEGED_MAX_PROMPT_LENGTH, PUBLIC_MAX_PROMPT_LENGTH } from "@/lib/models/public";

export const MAX_ATTACHMENT_COUNT = 3;
export const PUBLIC_MAX_ATTACHMENT_BYTES = 16 * 1024;
export const PRIVILEGED_MAX_ATTACHMENT_BYTES = 64 * 1024;
export const PUBLIC_MAX_ATTACHMENT_CONTEXT_LENGTH = 8_000;
export const PRIVILEGED_MAX_ATTACHMENT_CONTEXT_LENGTH = 32_000;

export type ChatAttachment = {
  name: string;
  content: string;
};

export type PromptValidationCode =
  | "invalid_prompt"
  | "invalid_attachments"
  | "too_many_attachments"
  | "attachment_too_large"
  | "attachments_too_large"
  | "provider_prompt_too_large";

export class PromptValidationError extends Error {
  readonly code: PromptValidationCode;
  readonly status: 400 | 413;

  constructor(code: PromptValidationCode, status: 400 | 413) {
    super(code);
    this.name = "PromptValidationError";
    this.code = code;
    this.status = status;
  }
}

export function promptValidationMessage(code: PromptValidationCode, language: "ru" | "en", privileged = false) {
  const promptLimit = privileged ? PRIVILEGED_MAX_PROMPT_LENGTH : PUBLIC_MAX_PROMPT_LENGTH;
  const messages = language === "ru"
    ? {
        invalid_prompt: `Запрос должен содержать от 1 до ${promptLimit} символов.`,
        invalid_attachments: "Вложения должны быть текстовыми файлами с именем и содержимым.",
        too_many_attachments: `Можно прикрепить не более ${MAX_ATTACHMENT_COUNT} файлов.`,
        attachment_too_large: "Размер одного текстового файла превышает допустимый лимит.",
        attachments_too_large: "Общий объём текста вложений превышает допустимый лимит.",
        provider_prompt_too_large: "Итоговый контекст запроса превышает допустимый лимит.",
      }
    : {
        invalid_prompt: `Prompt must be 1-${promptLimit} characters.`,
        invalid_attachments: "Attachments must be text files with a name and content.",
        too_many_attachments: `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`,
        attachment_too_large: "One text attachment exceeds the allowed size.",
        attachments_too_large: "The combined attachment context exceeds the allowed size.",
        provider_prompt_too_large: "The final request context exceeds the allowed size.",
      };
  return messages[code];
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function characterLength(value: string) {
  return Array.from(value).length;
}

export function validateAndBuildProviderPrompt(
  prompt: unknown,
  attachments: unknown,
  options: { privileged?: boolean } = {},
) {
  const privileged = options.privileged === true;
  const promptLimit = privileged ? PRIVILEGED_MAX_PROMPT_LENGTH : PUBLIC_MAX_PROMPT_LENGTH;
  const attachmentBytesLimit = privileged ? PRIVILEGED_MAX_ATTACHMENT_BYTES : PUBLIC_MAX_ATTACHMENT_BYTES;
  const attachmentContextLimit = privileged ? PRIVILEGED_MAX_ATTACHMENT_CONTEXT_LENGTH : PUBLIC_MAX_ATTACHMENT_CONTEXT_LENGTH;
  const providerContextLimit = promptLimit + attachmentContextLimit + 128;

  if (typeof prompt !== "string") throw new PromptValidationError("invalid_prompt", 400);
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt || characterLength(normalizedPrompt) > promptLimit) {
    throw new PromptValidationError("invalid_prompt", 400);
  }

  const rawAttachments = attachments == null ? [] : attachments;
  if (!Array.isArray(rawAttachments)) throw new PromptValidationError("invalid_attachments", 400);
  if (rawAttachments.length > MAX_ATTACHMENT_COUNT) throw new PromptValidationError("too_many_attachments", 400);

  const normalizedAttachments: ChatAttachment[] = [];
  for (const attachment of rawAttachments) {
    if (!attachment || typeof attachment !== "object") throw new PromptValidationError("invalid_attachments", 400);
    const item = attachment as { name?: unknown; content?: unknown };
    if (typeof item.name !== "string" || typeof item.content !== "string") {
      throw new PromptValidationError("invalid_attachments", 400);
    }

    const name = item.name.trim();
    const content = item.content.trim();
    if (!name || !content || characterLength(name) > 120) {
      throw new PromptValidationError("invalid_attachments", 400);
    }
    if (byteLength(content) > attachmentBytesLimit) {
      throw new PromptValidationError("attachment_too_large", 413);
    }
    normalizedAttachments.push({ name, content });
  }

  const attachmentContext = normalizedAttachments.map(({ name, content }) => `[${name}]\n${content}`).join("\n\n");
  if (characterLength(attachmentContext) > attachmentContextLimit) {
    throw new PromptValidationError("attachments_too_large", 413);
  }

  const providerPrompt = attachmentContext
    ? `${normalizedPrompt}\n\nAttached text files:\n${attachmentContext}`
    : normalizedPrompt;
  if (characterLength(providerPrompt) > providerContextLimit || byteLength(providerPrompt) > providerContextLimit * 4) {
    throw new PromptValidationError("provider_prompt_too_large", 413);
  }

  return { prompt: normalizedPrompt, attachments: normalizedAttachments, providerPrompt };
}

/** Backwards-compatible helper for server callers. It now validates instead of truncating. */
export function promptWithAttachments(prompt: string, attachments: unknown, options: { privileged?: boolean } = {}) {
  return validateAndBuildProviderPrompt(prompt, attachments, options).providerPrompt;
}
