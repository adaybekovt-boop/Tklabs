/** Cloudflare Worker entry point for the backend API. */
import handler from "vinext/server/app-router-entry";

import { countryRestrictedResponse, isRequestCountryRestricted } from "@/lib/country-access";

export { ClodexAccess } from "./clodex-access";
export { HealthStatus } from "./health-status";

type AppFetch = typeof handler.fetch;
type AppRequest = Parameters<AppFetch>[0];
type AppEnvironment = Parameters<AppFetch>[1];
type AppContext = Parameters<AppFetch>[2];

export default {
  async fetch(request: AppRequest, environment: AppEnvironment, context: AppContext) {
    if (isRequestCountryRestricted(request)) return countryRestrictedResponse();
    return handler.fetch(request, environment, context);
  },
};
