const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_LENGTH = 8_000;
const MAX_CONTEXT_LENGTH = 24_000;

export function promptWithAttachments(prompt: string, attachments: unknown) {
  if (!Array.isArray(attachments)) return prompt;

  const textAttachments = attachments
    .slice(0, MAX_ATTACHMENT_COUNT)
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") return null;
      const item = attachment as { name?: unknown; content?: unknown };
      if (typeof item.name !== "string" || typeof item.content !== "string") return null;
      const name = item.name.trim().slice(0, 120);
      const content = item.content.trim().slice(0, MAX_ATTACHMENT_LENGTH);
      return name && content ? `[${name}]\n${content}` : null;
    })
    .filter((attachment): attachment is string => Boolean(attachment));

  return textAttachments.length
    ? `${prompt}\n\nAttached text files:\n${textAttachments.join("\n\n")}`.slice(0, MAX_CONTEXT_LENGTH)
    : prompt;
}
