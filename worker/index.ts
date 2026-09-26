/** Cloudflare Worker entry point for the backend API. */
import handler from "vinext/server/app-router-entry";

import { getAuthCanonicalRedirect, withTrustedForwardedHeaders } from "@/lib/auth-origin";
import { countryRestrictedResponse, isRequestCountryRestricted } from "@/lib/country-access";

export { ClodexAccess } from "./clodex-access";
export { HealthStatus } from "./health-status";
export { InferenceScheduler } from "./inference-scheduler";

type AppFetch = typeof handler.fetch;
type AppRequest = Parameters<AppFetch>[0];
type AppEnvironment = Parameters<AppFetch>[1];
type AppContext = Parameters<AppFetch>[2];

const worker = {
  async fetch(request: AppRequest, environment: AppEnvironment, context: AppContext) {
    if (isRequestCountryRestricted(request)) return countryRestrictedResponse();
    const authRedirect = getAuthCanonicalRedirect(request);
    if (authRedirect) return authRedirect;
    return handler.fetch(withTrustedForwardedHeaders(request), environment, context);
  },
};

export default worker;
