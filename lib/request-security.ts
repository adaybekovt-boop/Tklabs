/**
 * Browser-origin guard for state-changing API routes. Direct non-browser
 * clients may omit Origin; when a browser sends it, it must match the Worker.
 */
export function isTrustedRequestOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin")?.trim();
  if (!origin || origin === "null") return !origin;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
