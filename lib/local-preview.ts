export type PreviewEnvironment = {
  NODE_ENV?: string;
  TKLABS_LOCAL_PREVIEW?: string;
  NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW?: string;
};

export function isLocalPreviewEnabled(environment: PreviewEnvironment = process.env) {
  return environment.NODE_ENV === "development"
    && (environment.TKLABS_LOCAL_PREVIEW === "true"
      || environment.NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW === "true");
}

export function isClientLocalPreviewEnabled(environment: PreviewEnvironment = process.env) {
  return environment.NODE_ENV === "development"
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
