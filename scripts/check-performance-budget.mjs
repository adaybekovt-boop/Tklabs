import { gzipSync } from "node:zlib";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const CLIENT_ROOT = resolve("dist/client");
const ASSET_ROOT = join(CLIENT_ROOT, "assets");
const IMAGE_ROOT = join(CLIENT_ROOT, "images");

// v0.21 adds an optional lazy KaTeX/MathML renderer. These aggregate limits include
// lazy client assets while preserving explicit caps for every production build.
// cssRaw raised 155_000 -> 163_000: the floating desktop nav pill (components/ui/navigation-menu.tsx)
// and the glass-morphism login card (components/ui/glass-card.tsx) are genuinely new, non-redundant
// UI, not accidental duplication. Duplicate arbitrary shadow/radius utilities were already
// consolidated (see app/page.tsx, app/login/page.tsx) to keep the increase to ~8KB raw.
const BUDGETS = {
  javascriptRaw: 1_400_000,
  javascriptGzip: 440_000,
  largestJavascript: 450_000,
  cssRaw: 163_000,
  imagesRaw: 700_000,
  largestImage: 300_000,
};

async function filesUnder(root) {
  const output = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) output.push(path);
    }
  }
  await visit(root);
  return output;
}

function formatBytes(bytes) { return `${(bytes / 1024).toFixed(1)} KB`; }

const assetFiles = await filesUnder(ASSET_ROOT);
const imageFiles = await filesUnder(IMAGE_ROOT);
if (assetFiles.length === 0) throw new Error("Performance budget could not find dist/client/assets. Run the production build first.");

const javascript = assetFiles.filter((path) => [".js", ".mjs"].includes(extname(path)));
const styles = assetFiles.filter((path) => extname(path) === ".css");
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".ico"]);
const images = imageFiles.filter((path) => imageExtensions.has(extname(path).toLowerCase()));

async function measurements(paths) { return Promise.all(paths.map(async (path) => ({ path, size: (await stat(path)).size }))); }

const jsMeasurements = await measurements(javascript);
const cssMeasurements = await measurements(styles);
const imageMeasurements = await measurements(images);
const jsRaw = jsMeasurements.reduce((total, item) => total + item.size, 0);
const jsGzip = (await Promise.all(javascript.map(async (path) => gzipSync(await readFile(path), { level: 9 }).byteLength))).reduce((total, size) => total + size, 0);
const cssRaw = cssMeasurements.reduce((total, item) => total + item.size, 0);
const imagesRaw = imageMeasurements.reduce((total, item) => total + item.size, 0);
const largestJs = jsMeasurements.toSorted((a, b) => b.size - a.size)[0] ?? { path: "none", size: 0 };
const largestImage = imageMeasurements.toSorted((a, b) => b.size - a.size)[0] ?? { path: "none", size: 0 };

const report = [
  ["Client JavaScript", jsRaw, BUDGETS.javascriptRaw],
  ["Client JavaScript (gzip)", jsGzip, BUDGETS.javascriptGzip],
  ["Largest JavaScript asset", largestJs.size, BUDGETS.largestJavascript],
  ["Client CSS", cssRaw, BUDGETS.cssRaw],
  ["Static images", imagesRaw, BUDGETS.imagesRaw],
  ["Largest image", largestImage.size, BUDGETS.largestImage],
];

for (const [label, actual, budget] of report) console.log(`${actual <= budget ? "PASS" : "FAIL"} ${label}: ${formatBytes(actual)} / ${formatBytes(budget)}`);
console.log(`Largest JavaScript: ${relative(CLIENT_ROOT, largestJs.path)}`);
console.log(`Largest image: ${relative(CLIENT_ROOT, largestImage.path)}`);

const failures = report.filter(([, actual, budget]) => actual > budget);
if (failures.length > 0) {
  process.exitCode = 1;
  throw new Error(`Performance budget exceeded for: ${failures.map(([label]) => label).join(", ")}`);
}
