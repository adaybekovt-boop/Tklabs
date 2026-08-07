# TK LAB access geography

Last reviewed: 2026-08-07

## Policy

TK LAB is available in all countries and regions except the current restricted-country list enforced in `lib/country-access.ts`:

- Belarus (`BY`)
- Cuba (`CU`)
- Iran (`IR`)
- North Korea (`KP`)
- Russia (`RU`)
- Syria (`SY`)

Kazakhstan (`KZ`) is explicitly protected as supported by the application policy.

The list is a service-compliance boundary, not a statement about users or nationalities. It is based on provider, export-control, sanctions, and service-availability constraints and should be reviewed when those constraints change.

## Enforcement

The Cloudflare Worker checks the edge-provided country before Vinext, authentication, or API routing. A restricted request receives HTTP `451 Unavailable For Legal Reasons` with `no-store` and `noindex` headers. This covers page traffic and direct API traffic with the same policy.

Production uses `request.cf.country` as the authoritative Cloudflare signal. `CF-IPCountry` is accepted only as a fallback for local/browser-assurance environments where `request.cf` is unavailable.

Special/unknown values such as `XX` and `T1` are not mapped to a restricted country. The geographic policy blocks known restricted jurisdictions; missing geolocation is not itself treated as a legal restriction.

## Initial source basis

The initial country list follows the locations explicitly named in NVIDIA's marketplace/export-restriction terms and is cross-checked against current U.S. export/sanctions guidance:

- NVIDIA Marketplace Terms of Sale: https://www.nvidia.com/en-us/about-nvidia/marketplace-terms-of-sale/
- NVIDIA Developer Program Terms: https://developer.nvidia.com/developer-program-terms-conditions
- U.S. Bureau of Industry and Security, Russia/Belarus guidance: https://www.bis.gov/licensing/country-guidance/russia-belarus
- U.S. Treasury OFAC sanctions programs: https://ofac.treasury.gov/sanctions-programs-and-country-information
- Cloudflare request metadata: https://developers.cloudflare.com/workers/runtime-apis/request/

These references can change. Before expanding or relaxing the deny-list, verify current provider terms and applicable legal requirements rather than relying only on this document.
