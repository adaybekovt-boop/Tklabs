export type PublicClodexModel = {
  key: string;
  name: string;
};

/** Experimental UI aliases. Provider model IDs stay in clodex-server.ts. */
export const CLODEX_MODELS: readonly PublicClodexModel[] = [
  { key: "clodex:fast", name: "Clodex Fast" },
  { key: "clodex:reasoning", name: "Clodex Reasoning" },
  { key: "clodex:pro", name: "Clodex Pro" },
] as const;
