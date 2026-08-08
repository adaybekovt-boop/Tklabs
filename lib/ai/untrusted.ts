export type UntrustedExternalText = string & { readonly __untrustedExternalText: unique symbol };

function safeLabel(value: string) { return value.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80) || "external"; }

export function wrapUntrustedExternalText(source: string, value: string): UntrustedExternalText {
  const label = safeLabel(source);
  return `<<<UNTRUSTED_EXTERNAL_DATA source=${label}>>>\n${value}\n<<<END_UNTRUSTED_EXTERNAL_DATA>>>` as UntrustedExternalText;
}
