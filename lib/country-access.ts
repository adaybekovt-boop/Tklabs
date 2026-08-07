export const RESTRICTED_COUNTRY_CODES = ["BY", "CU", "IR", "KP", "RU", "SY"] as const;

/**
 * Kazakhstan is explicitly protected from geo-restriction because TK LAB is
 * operated from Kazakhstan. Keep this invariant separate from the deny-list so
 * a future policy edit cannot accidentally make KZ unavailable.
 */
export const ALWAYS_SUPPORTED_COUNTRY_CODES = ["KZ"] as const;

export type RestrictedCountryCode = (typeof RESTRICTED_COUNTRY_CODES)[number];

const restrictedCountries = new Set<string>(RESTRICTED_COUNTRY_CODES);
const alwaysSupportedCountries = new Set<string>(ALWAYS_SUPPORTED_COUNTRY_CODES);

export type CountryAwareRequest = Request & {
  cf?: {
    country?: string | null;
  };
};

export function normalizeCountryCode(value: unknown) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function isCountryRestricted(value: unknown): value is RestrictedCountryCode {
  const code = normalizeCountryCode(value);
  if (!code || alwaysSupportedCountries.has(code)) return false;
  return restrictedCountries.has(code);
}

/**
 * Cloudflare's request.cf.country value is authoritative at the production
 * edge. CF-IPCountry is a fallback for local/browser-assurance environments
 * where request.cf is not populated.
 *
 * Unknown (XX) and Tor (T1) values are intentionally not treated as countries:
 * this policy restricts known jurisdictions rather than failing closed on
 * missing geolocation.
 */
export function getRequestCountry(request: Request) {
  const cloudflareCountry = normalizeCountryCode((request as CountryAwareRequest).cf?.country);
  if (cloudflareCountry) return cloudflareCountry;
  return normalizeCountryCode(request.headers.get("cf-ipcountry"));
}

export function isRequestCountryRestricted(request: Request) {
  return isCountryRestricted(getRequestCountry(request));
}

export function countryRestrictedResponse() {
  const body = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>TK LAB — unavailable in this location</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f4f1; color: #151515; }
    main { width: min(620px, calc(100% - 48px)); border: 1px solid #aaa; border-radius: 20px; padding: 36px; background: #fff; }
    p { line-height: 1.65; color: #555; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
    @media (prefers-color-scheme: dark) { body { background: #111; color: #f4f4f1; } main { background: #181818; border-color: #444; } p { color: #bbb; } }
  </style>
</head>
<body>
  <main>
    <div class="label">TK LAB / Access policy</div>
    <h1>Service unavailable in this location</h1>
    <p>TK LAB cannot provide access from this country or region because of provider, export-control, or service-availability requirements.</p>
    <p lang="ru">TK LAB не предоставляет доступ из этой страны или региона из-за требований провайдеров, экспортного контроля или доступности сервиса.</p>
  </main>
</body>
</html>`;

  return new Response(body, {
    status: 451,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
