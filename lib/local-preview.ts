export type PreviewEnvironment = {
  NODE_ENV?: string;
  TKLABS_LOCAL_PREVIEW?: string;
  NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW?: string;
};

export function isLocalPreviewEnabled(environment: PreviewEnvironment = process.env) {
  const serverFlag = environment.TKLABS_LOCAL_PREVIEW === "true";
  const publicFlag = environment.NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW === "true";

  // Normal local development keeps the simple server-side opt-in. Vinext may
  // compile the shared runtime module with a production-like NODE_ENV even
  // while `vinext dev` is serving Playwright; that case requires both flags.
  // A real production build rejects either flag in next.config.ts before the
  // Worker artifact can be produced.
  if (environment.NODE_ENV === "development") return serverFlag || publicFlag;
  return serverFlag && publicFlag;
}

export function isClientLocalPreviewEnabled(environment: PreviewEnvironment = process.env) {
  return environment.NODE_ENV !== "production"
    && environment.NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW === "true";
}

export function assertProductionPreviewDisabled(environment: PreviewEnvironment = process.env) {
  if (
    environment.NODE_ENV === "production"
    && (environment.TKLABS_LOCAL_PREVIEW === "true"
      || environment.NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW === "true")
  ) {
    throw new Error("Local preview flags must be disabled in production builds.");
  }
}
