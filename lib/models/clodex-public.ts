import "@/lib/public-branding";

export type PublicClodexModel = {
  key: string;
  name: string;
};

/** Experimental UI aliases. Provider model IDs stay server-side. */
export const CLODEX_MODELS: readonly PublicClodexModel[] = [
  { key: "clodex:fast", name: "ErmaPro Aura" },
  { key: "clodex:reasoning", name: "ErmaPro Lumen" },
  { key: "clodex:pro", name: "ProximaPro" },
] as const;
