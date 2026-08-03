# Imaginary Intelligence

A satirical AI facility built with React, TypeScript, Tailwind CSS 4 and Vinext. The page combines a cinematic Hero, an animated top dock menu, fictional telemetry and a local AI proof console.

## Local development

Run npm install, then npm run dev.

The AI chat uses the server-only /api/demo route. NVIDIA Build API is the primary provider through its OpenAI-compatible chat completions endpoint; Clodex remains an optional fallback and the deterministic edge response is used when no provider is available.

To enable NVIDIA locally, copy .env.example to .env.local and set NVIDIA_API_KEY_PRIMARY and NVIDIA_API_KEY_SECONDARY. Both keys stay server-side and are never bundled into the browser. The server uses the primary key first, swaps to the secondary key on quota or rate-limit responses, and then falls back to Clodex/local mode if both keys are unavailable. The chat sends a branded Erma key, while the server maps it to an allow-listed NVIDIA model ID.

The current aliases are grouped as light (ErmaSpark lite 0.9, Erma 1.0 instant, Erma Polos 1.0 think), medium (Erma-code-lite, Erma Dalos 1.1, Erma nutron 1.2 think), and heavy (Erma reborn 1.3 think, Erma apolon 1.4, Erma AsiMasi 2 preview). The aliases are product names; their server-side mappings live in lib/models.ts and can be changed as the NVIDIA catalog changes.

## Useful commands

- npm run dev - start the local development server
- npm run build - create the production build
- npm test - build and run server-render smoke tests
- npm run lint - check the TypeScript/React source

## Project structure

- app/ - routes, metadata, global styles and the local demo API
- components/ui/ - reusable shadcn-style UI components, including Hero, dock and AI chat
- components/site/ - facility-specific sections and layout
- lib/utils.ts - the shared cn helper
- vite.config.ts - local Vinext + Cloudflare Worker development/build setup

The project is not configured with GPT Sites metadata or a Sites deployment plugin. It can run locally and can be deployed through a regular Vinext/Cloudflare Worker workflow if needed.
