export type PreviewEnvironment = {
  NODE_ENV?: string;
  TKLABS_LOCAL_PREVIEW?: string;
  NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW?: string;
};

function hasExplicitPreviewFlags(environment: PreviewEnvironment) {
  return environment.TKLABS_LOCAL_PREVIEW === "true"
    && environment.NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW === "true";
}

export function isLocalPreviewEnabled(environment: PreviewEnvironment = process.env) {
  // Server preview requires two independent opt-in flags. Vinext may compile the
  // shared module with a production-like NODE_ENV even while its dev server is
  // running, so production safety is enforced at config/build time instead of
  // relying on NODE_ENV inside the runtime bundle.
  return hasExplicitPreviewFlags(environment);
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
