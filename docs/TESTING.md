# Testing strategy

TK Labs uses layered evidence rather than one oversized suite.

## Unit

`npm run test:unit` covers pure policy, parsing, normalization, release, quota, and security helpers.

## Integration

`npm run test:integration` covers Worker contracts, Durable Object behavior, request limits, provider lifecycle, release invariants, and repository architecture. Tests are grouped by durable domain when new coverage is added; historical release-named files remain only as compatibility evidence.

## Browser Assurance

`.github/workflows/e2e.yml` runs desktop Chromium, mobile Chromium, and mobile WebKit with a development-only preview boundary. AI responses are mocked at the SSE transport boundary. Browser tests must not use production credentials, D1 data, provider quota, or real account sessions.

## Security and supply chain

Validate runs production dependency audit, tracked-file secret scanning, CycloneDX SBOM generation, TypeScript, ESLint, tests, production build, performance budget, and Wrangler dry-run. CodeQL and Dependency Review are separate gates.

## Release evidence

A release is not ready until version consistency, migration compatibility, browser evidence for UI changes, Worker dry-run, and the documented rollback path all refer to the same final SHA.
