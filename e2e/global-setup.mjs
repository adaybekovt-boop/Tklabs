const port = Number(process.env.PLAYWRIGHT_PORT || 3100);
const baseURL = `http://127.0.0.1:${port}`;

/**
 * Next.js dev mode compiles routes lazily. Browser assurance should measure
 * responsive behavior, not fail because a first-hit route spends most of the
 * per-test budget compiling. Warm the privacy page once before parallel tests;
 * production compilation remains covered separately by the Validate workflow.
 */
export default async function globalSetup() {
  const response = await fetch(`${baseURL}/privacy`, {
    headers: {
      "x-tklabs-browser-assurance": "tklabs-playwright-v1",
    },
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    throw new Error(`Browser assurance warm-up failed for /privacy (${response.status}).`);
  }

  await response.arrayBuffer();
}
