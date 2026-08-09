export type SupportMethod = "kaspi" | "bank";

export type PublicSupportAvailability = {
  enabled: boolean;
  methods: SupportMethod[];
  verification: "manual-unverified";
};

export type RevealedSupportMethod = {
  method: SupportMethod;
  label: string;
  recipient: string;
  value: string;
  verification: "manual-unverified";
};

function clean(value: string | undefined, max: number) {
  return (value ?? "").trim().replace(/[\r\n\t]+/g, " ").slice(0, max);
}

function enabledByEnv() {
  const raw = clean(process.env.SUPPORT_ENABLED, 16).toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function recipientName() {
  return clean(process.env.SUPPORT_RECIPIENT_NAME, 100);
}

function methodValue(method: SupportMethod) {
  if (method === "kaspi") return clean(process.env.SUPPORT_KASPI_PHONE, 48);
  return clean(process.env.SUPPORT_BANK_IBAN, 64);
}

export function getSupportAvailability(): PublicSupportAvailability {
  if (!enabledByEnv()) return { enabled: false, methods: [], verification: "manual-unverified" };
  const methods: SupportMethod[] = [];
  if (methodValue("kaspi")) methods.push("kaspi");
  if (methodValue("bank")) methods.push("bank");
  return { enabled: methods.length > 0 && Boolean(recipientName()), methods, verification: "manual-unverified" };
}

export function revealSupportMethod(method: SupportMethod): RevealedSupportMethod | null {
  const availability = getSupportAvailability();
  if (!availability.enabled || !availability.methods.includes(method)) return null;
  const value = methodValue(method);
  const recipient = recipientName();
  if (!value || !recipient) return null;
  return {
    method,
    label: method === "kaspi" ? "Kaspi Gold" : clean(process.env.SUPPORT_BANK_LABEL, 80) || "Bank transfer (KZT)",
    recipient,
    value,
    verification: "manual-unverified",
  };
}
