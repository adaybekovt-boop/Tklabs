const SHARED_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "script-src-attr 'none'",
  "upgrade-insecure-requests",
];

// Framework hydration still emits inline bootstrap data in the current Vinext/Next
// build. Eval-like execution and inline event handlers are forbidden; a nonce-only
// script policy remains report-only until the runtime can carry a per-request nonce
// through the Cloudflare/Vinext rendering boundary without breaking hydration.
export const CONTENT_SECURITY_POLICY = [...SHARED_POLICY, "script-src 'self' 'unsafe-inline'"].join("; ");
export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [...SHARED_POLICY, "script-src 'self'", "report-uri /api/security/csp-report", "report-to csp-endpoint"].join("; ");

export const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
  { key: "Reporting-Endpoints", value: 'csp-endpoint="/api/security/csp-report"' },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY_REPORT_ONLY },
];
