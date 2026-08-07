import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v0.17.2 runs isolated Chromium and WebKit browser assurance", async () => {
  const config = await read("playwright.config.mjs");
  const workflow = await read(".github/workflows/e2e.yml");
  const scenarios = await read("e2e/playground.spec.mjs");

  assert.match(config, /Desktop Chrome/);
  assert.match(config, /Pixel 7/);
  assert.match(config, /iPhone 15/);
  assert.match(config, /TKLABS_LOCAL_PREVIEW/);
  assert.match(workflow, /Browser Assurance/);
  assert.match(workflow, /@playwright\/test@1\.61\.1/);
  assert.match(workflow, /playwright install --with-deps chromium webkit/);
  assert.match(workflow, /browser-assurance-/);
  assert.match(scenarios, /page\.route/);
  assert.match(scenarios, /text\/event-stream/);
  assert.match(scenarios, /mobile-prompt-input/);
  assert.match(scenarios, /manifest\.webmanifest/);
});

test("browser tests retain failure evidence without changing the lockfile", async () => {
  const workflow = await read(".github/workflows/e2e.yml");
  const config = await read("playwright.config.mjs");
  assert.match(workflow, /--package-lock=false/);
  assert.match(config, /trace: "retain-on-failure"/);
  assert.match(workflow, /playwright-report/);
  assert.match(workflow, /test-results/);
  assert.match(workflow, /if: always\(\)/);
});
