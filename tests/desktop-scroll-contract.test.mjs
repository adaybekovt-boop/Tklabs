import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("desktop input and workspace styles do not inherit touch-only mobile constraints", async () => {
  const [mobileCss, input] = await Promise.all([
    text("app/mobile-workspace.css"),
    text("components/ui/ai-chat-input.tsx"),
  ]);

  assert.doesNotMatch(mobileCss, /@media \(max-width: 767px\), \(pointer: coarse\)/);
  assert.doesNotMatch(mobileCss, /max-height: 520px\) and \(pointer: coarse\)/);
  assert.match(input, /matchMedia\("\(min-width: 768px\)"\)/);
});

test("desktop footer and legal overlay keep content and scroll ownership available", async () => {
  const [css, footer, terms] = await Promise.all([
    text("app/globals.css"),
    text("components/site/StitchFooter.tsx"),
    text("components/legal/TermsGate.tsx"),
  ]);

  assert.match(css, /html \{[\s\S]*overflow-y: auto/);
  assert.match(footer, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(0,2fr\)\]/);
  assert.doesNotMatch(footer, /min-w-\[620px\]/);
  assert.match(terms, /lockDocumentScroll/);
  assert.match(terms, /createPortal\(gate, document\.body\)/);
  assert.match(terms, /data-terms-gate/);
  assert.match(terms, /data-terms-gate-scroll/);
  assert.match(terms, /data-terms-gate-actions/);
});

test("mobile dock releases its scroll lock when a viewport becomes desktop", async () => {
  const dock = await text("components/site/AppDock.tsx");

  assert.match(dock, /MOBILE_DOCK_QUERY/);
  assert.match(dock, /handleViewportChange/);
  assert.match(dock, /if \(!event\.matches\) closeMenu\(\)/);
  assert.match(dock, /mobileDock\.addEventListener\("change", handleViewportChange\)/);
});
