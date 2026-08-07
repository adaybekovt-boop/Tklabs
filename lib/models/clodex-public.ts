import "@/lib/public-branding";

export type PublicClodexModel = {
  key: string;
  name: string;
};

/** Experimental UI aliases. Provider model IDs stay server-side. */
export const CLODEX_MODELS: readonly PublicClodexModel[] = [
  { key: "clodex:fast", name: "External API · Fast" },
  { key: "clodex:reasoning", name: "External API · Reasoning" },
  { key: "clodex:pro", name: "External API · Pro" },
] as const;
