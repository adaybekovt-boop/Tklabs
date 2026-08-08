import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { TRUST_DISCLOSURE_VERSION, acknowledgeTrustDisclosure, isTrustDisclosureAcknowledged } from "../lib/trust-disclosure.ts";

function storage() { let value = null; return { getItem() { return value; }, setItem(_key, next) { value = next; } }; }

test("just-in-time trust disclosure is versioned and locally acknowledgeable", () => { const store = storage(); assert.equal(isTrustDisclosureAcknowledged(store), false); acknowledgeTrustDisclosure(store); assert.equal(isTrustDisclosureAcknowledged(store), true); assert.equal(TRUST_DISCLOSURE_VERSION, "2026-08-08.v1"); });
test("mobile workspace exposes Trust control and pre-send disclosure", async () => { const mobile = await readFile("components/playground/MobileWorkspaceSwitcher.tsx", "utf8"); const sheet = await readFile("components/playground/TrustControlSheet.tsx", "utf8"); assert.match(mobile, /data-trust-jit-disclosure/); assert.match(mobile, /TrustControlSheet/); assert.match(sheet, /not end-to-end encryption/i); assert.match(sheet, /attachments leave the device/i); });
