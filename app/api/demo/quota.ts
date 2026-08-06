import {
  DemoRateLimitUnavailableError,
  commitDemoRequest,
  releaseDemoRequest,
  reserveDemoRequest,
} from "@/lib/demo-rate-limit-access";
import { getRateLimitIdentity, RateLimitConfigurationError } from "@/lib/rate-limit-identity";

import type { Language } from "./contracts";
import { jsonResponse } from "./http";

type QuotaSettlement = "pending" | "committed" | "released";

export type DemoQuota = {
  cookie: string | null;
  commit(): Promise<void>;
  release(): Promise<void>;
};

function noOpQuota(): DemoQuota {
  return {
    cookie: null,
    async commit() {},
    async release() {},
  };
}

function unavailableResponse(language: Language, requestId: string, cookie: string | null) {
  return jsonResponse(
    {
      error: language === "ru"
        ? "Демо временно недоступно. Попробуйте позже."
        : "The demo is temporarily unavailable. Please try again later.",
      requestId,
    },
    requestId,
    503,
    cookie,
  );
}

export async function createDemoQuota(input: {
  request: Request;
  requestId: string;
  language: Language;
  sessionEmail: string;
  privileged: boolean;
}): Promise<{ quota: DemoQuota } | { response: Response }> {
  if (input.privileged) return { quota: noOpQuota() };

  let cookie: string | null = null;
  let identifier = "";
  let reservationId = "";
  let allowance;

  try {
    const identity = await getRateLimitIdentity(input.request, input.sessionEmail);
    cookie = identity.setCookie;
    identifier = identity.identifier;
    allowance = await reserveDemoRequest(identity.identifier);
  } catch (error) {
    if (!(error instanceof DemoRateLimitUnavailableError || error instanceof RateLimitConfigurationError)) {
      console.warn("demo.rate_limit_unavailable", { requestId: input.requestId });
    }
    return { response: unavailableResponse(input.language, input.requestId, cookie) };
  }

  if (!allowance.allowed) {
    const retryAfter = allowance.resetAt
      ? Math.max(1, Math.ceil((allowance.resetAt - Date.now()) / 1000))
      : undefined;
    const response = jsonResponse(
      {
        error: input.language === "ru"
          ? "Дневной лимит демо исчерпан. Попробуйте завтра."
          : "Daily demo limit reached. Please try again tomorrow.",
        retryAt: allowance.resetAt,
        requestId: input.requestId,
      },
      input.requestId,
      429,
      cookie,
    );
    if (retryAfter) response.headers.set("retry-after", String(retryAfter));
    return { response };
  }

  reservationId = allowance.reservationId ?? "";
  if (!reservationId) return { response: unavailableResponse(input.language, input.requestId, cookie) };

  let settlement: QuotaSettlement = "pending";
  return {
    quota: {
      cookie,
      async commit() {
        if (settlement !== "pending") return;
        settlement = "committed";
        try {
          await commitDemoRequest(identifier, reservationId);
        } catch {
          console.warn("demo.rate_limit_commit_failed", { requestId: input.requestId });
        }
      },
      async release() {
        if (settlement !== "pending") return;
        settlement = "released";
        try {
          await releaseDemoRequest(identifier, reservationId);
        } catch {
          console.warn("demo.rate_limit_release_failed", { requestId: input.requestId });
        }
      },
    },
  };
}
