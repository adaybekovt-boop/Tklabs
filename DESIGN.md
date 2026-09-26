# Workspace design decisions

Retain TK's monochrome tokens and Inter/Cyrillic reading typography. Keep assistant replies flat in the transcript, user prompts compact, rail at 224px and contextual canvas near 420px. Desktop panes use separators, not nested decorative cards. On narrow viewports context becomes a focus-trapped sheet. Status comes only from runtime events; there is no decorative staged progress or ambient motion. Reduced motion removes sheet entry transitions. Visible focus, 44px touch targets, bounded code/table scrolling, RU/EN and dark/light are required states. The product's signature is the actual request → tool/source → exact versioned output relationship.
---

## Public homepage contract

### Direction and continuity
One task assembles into Erma's workspace as native scroll advances the scene. The homepage belongs to the same product as Models and Documentation. Those rendered pages were checked before the final palette correction: neutral surfaces, monochrome actions, restrained separators, shared navigation identity. The user's review supersedes the earlier orange/dark brief.

### Tokens and typography
Every homepage color aliases the existing application token: background, surface-container-lowest, on-surface, secondary, outline-variant, primary and on-primary. There is no forced theme, custom orange, body palette or dock override. Light/dark changes apply across navigation. Canonical SiteLogo and the application Inter body font are reused. Local Oswald subsets support the larger film titles and both scripts; normal product content remains in the shared sans-serif face. Data identifiers use system monospace. No gradients, grain, glow or ambient loops.

### Composition
Wide view: short captions occupy the left rail and product planes the right field. Compact view: captions occupy a shallow top band and the product uses the width below. The source scene deliberately has no caption: the answer and its source carry the meaning. All visible 'example / no AI request' footnotes were removed at the user's request; semantic illustration and version-control labels still distinguish the demonstration. The demo performs no network generation or real archive write.

### Choreography and ownership
One native-scroll controller owns film transforms and opacity. A sticky stage, cached layout and demand-driven RAF create reversible motion; no extra animation package or independent scene listeners. Generic MotionOrchestrator excludes this subtree. Geometry is remeasured on resize and font readiness, and all effects clean up on navigation or reduced-motion changes.

The composer enlarges; Auto draws its route; the selected route clears before the answer enters. The model label stays hidden until the answer settles into its final transcript position. The composer clears during the enlarged answer/source view. The source's top position derives from the measured answer height. Archive, model, revision and composer arrive only after the foreground scene has given up their space. Draft text clears before the checklist enters. The final window resolves around those same elements. Short labels never masquerade as live tool execution or hidden reasoning.

Film activates at 600px width and 600px height when motion is allowed, including the user's 659x672 browser. Smaller screens use native unpinned scroll entrances; reduced motion and no JavaScript expose a complete sequential document. No scroll interception. Header, app dock and footer clearance are reserved in the layout. Interactive targets retain at least 44px hit areas.

### Product structure
Current public names come from PUBLIC_ERMA_MODELS and routing selection from the server selector. The final illustration uses Activity, Context, Task and Files alongside the conversation. The example compares local archive with manual Workspace Sync and links to real documentation. Versions are local demonstration state. The existing /playground authentication boundary is unchanged.

### Verification contract
Check RU/EN, both themes across Models and Documentation, 1920/1440/1280/1024/834/659/390 widths, forward/reverse scroll, visible-plane collisions at intermediate progress, native links, keyboard version selection, no-JS and reduced-motion cleanup. Build and performance budgets remain mandatory. A successful static screenshot alone does not validate motion.

### References
anti-AI-SlopT 1955a361136dbe0a9659d89af6f3918901c51650 and cdesign-skill ba18ec49aa660b31cbc3012a8cd35ed9e9a7c6a1: skills, anti-patterns, Director's Roll, content and motion recipes. Existing Vinext architecture is preserved as requested. Haiku is unavailable; QA runs inline.
