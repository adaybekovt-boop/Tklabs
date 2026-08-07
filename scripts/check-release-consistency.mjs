import { access, readFile } from "node:fs/promises";

function fail(message) {
  console.error(`Release consistency failed: ${message}`);
  process.exitCode = 1;
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const releaseSource = await readFile("lib/release-version.ts", "utf8");
const workerSource = await readFile("public/sw.js", "utf8");

const releaseMatch = releaseSource.match(/CURRENT_RELEASE_VERSION = "v([^\"]+)"/);
const badgeMatch = releaseSource.match(/CURRENT_RELEASE_BADGE = "v([^\"]+)"/);
const cacheMatch = workerSource.match(/CACHE_VERSION = "v([^\"]+)"/);
const release = releaseMatch?.[1];
const packageVersion = packageJson.version;
const lockVersion = packageLock.packages?.[""]?.version ?? packageLock.version;

if (!release) fail("CURRENT_RELEASE_VERSION is missing");
if (release && packageVersion !== release) fail(`package.json=${packageVersion}, release=${release}`);
if (release && lockVersion !== release) fail(`package-lock.json=${lockVersion}, release=${release}`);
if (release && badgeMatch?.[1] !== release) fail(`release badge does not match v${release}`);
if (release && cacheMatch?.[1] !== release) fail(`Service Worker cache does not match v${release}`);
if (release) {
  try {
    await access(`docs/releases/v${release}.md`);
  } catch {
    fail(`docs/releases/v${release}.md is missing`);
  }
}

if (!process.exitCode) console.log(`Release identity is consistent at v${release}.`);
