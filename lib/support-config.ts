export type SupportMethod = "kaspi" | "bank";

const DEFAULT_DONATION_ALERTS_URL = "https://www.donationalerts.com/r/xenonraze";

export type PublicSupportAvailability = {
  enabled: boolean;
  donationAlertsUrl: string;
  methods: SupportMethod[];
  verification: "provider-or-manual";
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

function donationAlertsUrl() {
  const configured = clean(process.env.SUPPORT_DONATIONALERTS_URL, 240) || DEFAULT_DONATION_ALERTS_URL;
  try {
    const url = new URL(configured);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (host !== "donationalerts.com" && host !== "www.donationalerts.com")) return DEFAULT_DONATION_ALERTS_URL;
    return url.toString();
  } catch {
    return DEFAULT_DONATION_ALERTS_URL;
  }
}

function recipientName() {
  return clean(process.env.SUPPORT_RECIPIENT_NAME, 100);
}

function methodValue(method: SupportMethod) {
  if (method === "kaspi") return clean(process.env.SUPPORT_KASPI_PHONE, 48);
  return clean(process.env.SUPPORT_BANK_IBAN, 64);
}

export function getSupportAvailability(): PublicSupportAvailability {
  const methods: SupportMethod[] = [];
  if (enabledByEnv() && recipientName()) {
    if (methodValue("kaspi")) methods.push("kaspi");
    if (methodValue("bank")) methods.push("bank");
  }
  return {
    enabled: true,
    donationAlertsUrl: donationAlertsUrl(),
    methods,
    verification: "provider-or-manual",
  };
}

export function revealSupportMethod(method: SupportMethod): RevealedSupportMethod | null {
  const availability = getSupportAvailability();
  if (!availability.methods.includes(method)) return null;
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
