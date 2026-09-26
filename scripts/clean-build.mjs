import { rm } from "node:fs/promises";

// Vinext can retain old hashed client chunks across builds. Remove only the
// generated output so deployment and aggregate size checks describe this build.
await rm(new URL("../dist/", import.meta.url), { recursive: true, force: true });
