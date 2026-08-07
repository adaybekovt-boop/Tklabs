import { acceptsEventStream } from "./contracts";
import { respondWithDemoJson } from "./json-responder";
import { prepareDemoRequest } from "./request-context";
import { DemoStreamSession } from "./stream-session";

export const runtime = "edge";

export async function POST(request: Request) {
  const preparation = await prepareDemoRequest(request);
  if ("response" in preparation) return preparation.response;
  if (acceptsEventStream(request)) return new DemoStreamSession(preparation.prepared).response();
  return respondWithDemoJson(preparation.prepared);
}
