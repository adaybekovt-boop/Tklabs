import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ALWAYS_SUPPORTED_COUNTRY_CODES,
  RESTRICTED_COUNTRY_CODES,
  getRequestCountry,
  isCountryRestricted,
  isRequestCountryRestricted,
} from "../lib/country-access.ts";

test("country access policy restricts the compliance deny-list", () => {
  assert.deepEqual([...RESTRICTED_COUNTRY_CODES], ["BY", "CU", "IR", "KP", "RU", "SY"]);
  for (const country of RESTRICTED_COUNTRY_CODES) assert.equal(isCountryRestricted(country), true);
});

test("Kazakhstan is explicitly protected as supported", () => {
  assert.deepEqual([...ALWAYS_SUPPORTED_COUNTRY_CODES], ["KZ"]);
  assert.equal(isCountryRestricted("KZ"), false);
  assert.equal(isCountryRestricted("kz"), false);
});

test("unknown geolocation and Tor pseudo-country do not become jurisdiction blocks", () => {
  assert.equal(isCountryRestricted(undefined), false);
  assert.equal(isCountryRestricted("XX"), false);
  assert.equal(isCountryRestricted("T1"), false);
});

test("request country prefers Cloudflare metadata and supports local header fallback", () => {
  const cloudflareRequest = new Request("https://tklabs.uk/");
  Object.defineProperty(cloudflareRequest, "cf", { value: { country: "IR" } });
  assert.equal(getRequestCountry(cloudflareRequest), "IR");
  assert.equal(isRequestCountryRestricted(cloudflareRequest), true);

  const localRequest = new Request("https://tklabs.uk/", { headers: { "cf-ipcountry": "KZ" } });
  assert.equal(getRequestCountry(localRequest), "KZ");
  assert.equal(isRequestCountryRestricted(localRequest), false);
});

test("Worker and sign-in surface enforce and disclose the country policy", async () => {
  const [worker, login, supportedCountries] = await Promise.all([
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/supported-countries/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(worker, /isRequestCountryRestricted\(request\)/);
  assert.match(worker, /countryRestrictedResponse\(\)/);
  assert.match(login, /href="\/supported-countries"/);
  assert.match(supportedCountries, /Казахстан/);
  assert.match(supportedCountries, /Kazakhstan/);
});
