import { acceptsEventStream } from "./contracts";
import { respondWithDemoJson } from "./json-responder";
import { prepareDemoRequest } from "./request-context";
import { DemoStreamSession } from "./stream-session";

// Architecture boundary: createDemoQuota, quota.commit(), quota.release(),
// prepareReadOnlyToolAugmentation, resolveFallback, and send("tool", trace)
// are delegated to request-context, responders, and DemoStreamSession. The
// public route remains transport orchestration only.
export const runtime = "edge";

export async function POST(request: Request) {
  const preparation = await prepareDemoRequest(request);
  if ("response" in preparation) return preparation.response;
  if (acceptsEventStream(request)) return new DemoStreamSession(preparation.prepared).response();
  return respondWithDemoJson(preparation.prepared);
}
