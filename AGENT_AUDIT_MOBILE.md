# Mobile audit — overnight pass

Date: 12 August 2026
Branch: `agent/mobile-overnight` (isolated git worktree at `agent_work-mobile`, own history rooted at a baseline commit of `agent_work` as it stood at session start)

## How this session ended

This was cut short by a direct real-time request from the owner (computer fan noise from running tests while they were trying to sleep). All dev servers, browsers, and test runs were stopped immediately on request. Everything below reflects what was actually verified before that point — I have not padded this with anything unverified. The single biggest gap versus the original brief is **no final Core Web Vitals numbers** (see "What's still open" below) — that should be the first thing a follow-up session does.

## Setup

- Isolated via `git worktree` as instructed, with one correction: `agent_work` turned out to already be *inside* the parent TKlab repo's working tree (nested, untracked), so `git rev-parse --is-inside-work-tree` returned true for the wrong reason — it was detecting the parent repo, not an independent history for `agent_work` itself. Ran `git init` directly inside `agent_work` (with a local-only git identity, no global config touched) before creating the worktree, so this branch's history is actually scoped to `agent_work`'s contents rather than accidentally forking off the parent TKlab repo's `main`.
- `npm ci`, `.env.local` copied from `C:\Users\tamer\Desktop\TKlab\.env.local` (not committed — already covered by `.env*` in `.gitignore`).
- `@playwright/test` installed as a devDependency (it was referenced by `playwright.config.mjs` but not installed) plus Chromium/WebKit browsers.
- `.claude/launch.json` created locally for the dev server (gitignored, not committed).

## Baseline verification (before any changes)

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 errors, 6 pre-existing warnings — unused params in `hooks/chat-request/persistence.ts`, anonymous default export in `worker/index.ts`) |
| `npm run test:unit` | 22/22 pass |
| `npm run test:integration` | 289/289 pass |
| `npm run build` | pass (see note below) |
| `npm run perf:budget` | **pass with margin** — gzip JS 422.0 KB / 429.7 KB budget |

**Build note:** `npm run build` fails against the copied `.env.local` as-is, because it has `TKLABS_LOCAL_PREVIEW=true` / `NEXT_PUBLIC_TKLABS_LOCAL_PREVIEW=true` set (needed for local dev), and `lib/local-preview.ts` deliberately throws if those flags are set under `NODE_ENV=production` — a real safety guard, working as intended. I ran the build with those two vars overridden to `false` at the shell level rather than editing `.env.local`. Not a bug; just document it for whoever runs `npm run build` locally next.

`AGENT_AUDIT.md`'s performance-budget numbers (437.4 KB gzip, over budget) are **already stale** — the copy in `agent_work` had already been fixed before I started (client dictionaries split out; current state is 422.0 KB gzip, comfortably under the 429.7 KB budget). I did not touch the budget or the dictionary split further.

## What I verified from `AGENT_AUDIT.md`'s "Что уже реализовано" list

The instruction was explicit not to trust this list — treat it as hypotheses, not facts. Checked each one that's mobile-relevant:

| Claim | Verified? | Notes |
|---|---|---|
| KaTeX lazy-loaded, only when math is present | **True** | `components/playground/MarkdownMessage.tsx` — `lazy(() => import("rehype-katex")...)` behind a regex `containsMath()` check, `Suspense` fallback renders plain markdown. Confirmed by reading the code; this is real, not just a claim. |
| Perf budget passes | **True** | See table above. |
| AI-slop captions removed | **True** | Grepped for every specific string `AGENT_AUDIT.md` flagged (AppDock hints, RewardedAd CTA subtext, MobileChatDrawer footer line, StitchFooter tagline, History/Conversations double-label, documentation "Open section") — none remain. |
| TermsGate / RewardedAdGate have focus trap, Escape, focus restoration | **True** | Both use the same hand-rolled pattern: `requestAnimationFrame` to focus the first focusable element, a `keydown` listener that traps Tab at the dialog boundary, and a cleanup that restores focus to `previousFocusRef`. TermsGate has no Escape handler, which is correct — it's a mandatory consent gate, not a dismissible one. **However**, TermsGate had a real viewport-overflow bug on mobile — see Fixes below. |
| Mobile transcript doesn't re-announce the whole archive per token | **True** | `components/playground/PlaygroundChat.tsx:414` — a dedicated `<div class="sr-only" aria-live="polite" aria-atomic="true">{liveStatusLabel}</div>` carries the short generating/done/error status. The transcript itself uses `role="log"` with no explicit `aria-live`/`aria-atomic`, which is the architecturally correct pattern for a running transcript (implicit `live=polite`, `atomic=false`, so only the actually-changed text node gets announced — not the whole log). Matches what `docs/CHAT_UX_V0.9.0.md` describes. |
| Local archive bounded, protects against one huge conversation | **True** | `lib/local-archive.ts`: `MAX_SESSIONS=30`, `MAX_MESSAGES_PER_SESSION=80`, `MAX_SESSION_JSON_LENGTH=500_000` enforced via `limitSessionSize()`, which trims the *oldest* messages from a single session (not just whole sessions) until it's under budget. This directly answers the audit's original "one very long conversation can still blow the size budget" complaint. |
| `AI_TOOL_NAMES` allowlist in `local-archive.ts` is in sync with the real tool list | **True** | Compared against `lib/ai/types.ts`'s `AiToolName` union — all 12 entries match exactly, same order. |
| `localStorage` access wrapped in try/catch (private-mode safety) | **True** | `lib/chat-draft.ts`, `lib/privacy-mode.ts` both wrap `window.localStorage` access itself, not just the read/write call. |
| Global observers (`PublicBrandingGuard`, `MotionOrchestrator`) batch DOM work instead of running per-mutation | **Partially true** | Both already use a `requestAnimationFrame`-batched pending-set pattern rather than doing work synchronously inside the `MutationObserver` callback — this part of the audit's original complaint is already addressed. **But** both still `observe()` the entire `document.documentElement` / `document.body`, not a scoped container, so every DOM mutation anywhere in the app (including every streamed token in the chat transcript) still has to pass through the observer's own record-filtering, even though neither observer cares about chat content. I did not change this — see "What's still open." |
| `ai-chat-input.tsx` uses a 1024px breakpoint for the Enter-submits-on-desktop behavior | **False, already fixed / audit was stale** | Current code (line 527) uses `window.matchMedia("(min-width: 768px)")`, matching the mobile breakpoint used everywhere else in the app. This was already flagged as a discrepancy in this branch's own `CLAUDE.md` before I started; confirmed correct. |
| Model picker popup has no collision handling | **False, already fixed** | `components/ui/ai-model-select.tsx` computes `maxHeight` from real viewport height and flips `above`/`below` placement based on available room (lines ~583–620). This is Codex's file (shared/desktop zone) — I verified by reading, did not touch it or claim credit. |

## Fixes made (all in my zone, all committed)

Branch: `agent/mobile-overnight`, 4 commits on top of the baseline snapshot.

### 1. `components/legal/TermsGate.tsx` — accept button could be pushed off-screen

**Found via:** a new Playwright geometry assertion (`e2e/playground.spec.mjs`, existing test "terms gate stays in the visual viewport on a tall mobile page") failing consistently, and confirmed visually with a screenshot.

On a real consent document (12 sections of legal text) at 412×915 (Pixel 7) or 393×852 (iPhone 15), the terms panel let its total content grow taller than the viewport and relied on the *whole dialog* scrolling to reach the Accept button — but only the terms-text box had a visible internal scrollbar affordance, so there was no clear cue that scrolling further (past what looks like the end of a self-contained scroll box) was needed. Measured: the action row's bottom edge sat **~170px below** the visible viewport right after switching from the language-choice screen to the terms screen. Screenshot before the fix showed the checkbox and Accept button completely covered/off-screen, with only the model picker and Voice button visible above the fold.

**Fix:** restructured the panel as a flex column capped to `h-full` (100dvh) on mobile (`md:` reverts to the original centered-card desktop layout, unchanged). The terms text area is now `flex-1 min-h-0 overflow-y-auto` — it absorbs the available space and scrolls internally — while the header, intro, checkbox, and Accept button are `shrink-0` and therefore always inside the viewport, no additional scroll required. Kept `overflow-y-auto` on the panel itself as a fallback for the theoretical extreme case (accessibility text-zoom, etc.) where even the fixed pieces don't fit.

**Verified:** Playwright geometry assertion passes on both `mobile-chromium` and `mobile-webkit`; screenshot confirms the Accept button and checkbox are visible with the long text visibly truncated mid-paragraph by its own scroll box.

### 2. `app/mobile-workspace.css` — two real mobile bugs

**a) Sub-44px tap targets.** `.mobile-workspace-switcher__item` (the Chat/Tasks/Files switcher, `components/playground/MobileWorkspaceSwitcher.tsx`) had `min-height: 2.4rem` (38.4px) in portrait and `2.1rem` (33.6px) in landscape — both below the 44px minimum the project's own docs mandate for action-critical controls (`docs/CHAT_UX_V0.9.0.md`: *"Tap targets use a minimum 44px control height where the control is action-critical."*). Raised both to `2.75rem` (44px) and grew `--mobile-workspace-dock-height` to fit (portrait 3.25rem→3.6rem, landscape 2.85rem→3.15rem). Verified with a new Playwright test that measures every switcher button's rendered height at 320px width.

**b) First-time trust-disclosure banner covering the composer.** `.mobile-trust-jit-disclosure` (the one-time "AI requests are sent to an external provider" notice) was a `position: fixed` overlay anchored only relative to the bottom dock, with no awareness of the composer sitting above it. On a first-time visit at a realistic phone height (tested 360×780), it rendered **directly on top of the composer**, fully covering the textarea, attachment button, and Send button — confirmed with a screenshot; only the Voice button and model picker peeked out above it. A first-time user on a shorter phone literally could not send their first message until they found and dismissed a banner that was itself covering the only way to interact with the page. Re-anchored it below the chat header instead (`top: calc(safe-area-inset-top + header height + gap)`), where it can only ever sit over empty transcript space, never the input row.

### 3 & 4. Test infrastructure fixes (not app bugs, but blocked verification of app bugs)

Two pre-existing e2e failures turned out to be locator bugs in the tests themselves, not product regressions — I did not "fix a test to make it pass," I fixed genuinely wrong locators after confirming the underlying UI was correct:

- **`e2e/playground.spec.mjs`** — "mocked SSE reaches the transcript" used an unscoped `page.getByText(...)` that matched both the transcript message *and* the desktop history sidebar's new entry (which legitimately shows the same first-message text as its title). Scoped to `page.getByRole("log").getByText(...)`.
- **`e2e/v023.spec.mjs`** — "mobile attachment plus opens a visible tappable menu" used `button[aria-expanded]` + `.first()` to find the attachment trigger, but the *model picker* trigger also carries `aria-expanded` and renders earlier in the composer's DOM, so the test was silently opening the model dropdown instead of the attachment menu. **Confirmed via `git stash` against the pre-session baseline that this predates tonight's work** — not something I broke. Rescoped to a tag+`aria-label` selector (a plain `getByRole("button", {name})` would *also* have been ambiguous: the hidden file `<input>` shares the same `aria-label` and Chromium exposes file inputs with an implicit button role in the accessibility tree — a subtlety worth knowing if anyone else touches this test).

Also added `test-results/`, `playwright-report/`, `playwright/.cache/` to `.gitignore` (previously untracked/uncommitted-by-luck).

### 5. New test coverage: `e2e/mobile-viewport-sweep.spec.mjs`

The brief specifically asked for width coverage the existing device-preset-based e2e suite doesn't give: 320/360/390/414/430/768px explicitly, not just the two fixed device presets (~412px Pixel 7, ~393px iPhone 15). Added:

- No-horizontal-overflow checks for `/` and the playground harness at all 6 portrait widths plus 3 landscape sizes.
- A 44px tap-target sweep for the mobile workspace switcher at 320px (this is what caught bug 2a above).
- A long-answer render check (Markdown + inline/block KaTeX + a wide table + a long unbroken code line) at 360px, confirming no page-level horizontal overflow.
- A short-viewport check (390×420, roughly what's left after a software keyboard covers ~half a phone screen) confirming the composer stays visible and reachable.

## Full regression status (last clean run, before being asked to stop)

- `npm run typecheck` — pass
- `npm run lint` — pass (same 6 pre-existing warnings, 0 errors)
- `npm run test:unit` — 22/22 pass
- `npm run test:integration` — 289/289 pass
- `npm run build` — pass (with the `TKLABS_LOCAL_PREVIEW` override noted above)
- `npm run perf:budget` — pass, 422.1 KB / 429.7 KB gzip (unaffected by CSS-only changes)
- Full `e2e/` suite, all 5 spec files × all 3 projects (`desktop-chromium`, `mobile-chromium`, `mobile-webkit`): **105 tests total, 48 passed, 57 correctly skipped (project-scoped tests), 0 failed.**

Did not run `npm run check` as a whole (it includes `trust:legal`, which was explicitly out of scope and known-failing for reasons unrelated to this session — legal digest mismatch). Ran every other constituent piece individually instead. Did not separately run `security:secrets` / `migration:safety` / `trust:policy` / `trust:check` / `release:check` — none of these are mobile-UI-observable and all touch explicitly out-of-scope files (`worker/*`, `db/*`, legal/policy registries).

## What's still open

**Ranked by what a follow-up session should tackle first:**

1. **Real Core Web Vitals numbers — not delivered.** This was supposed to be the single biggest value-add of this session (the previous audit explicitly couldn't do this — "доступного Chrome DevTools MCP в этой среде нет"). I built a Playwright + `PerformanceObserver` harness (LCP via `largest-contentful-paint`, CLS via `layout-shift` with `hadRecentInput` filtering, TBT approximated as Σ(longtask.duration − 50ms), INP approximated as the ~98th-percentile `event` timing entry with an `interactionId`) against Pixel 7 emulation with Slow-4G + 4× CPU throttling via CDP. Static-page measurement (home, patch-notes) was close to working; the interactive streaming-answer scenario hit a real hydration-timing gap under throttling — the SSR'd textarea is visibly present well before React finishes hydrating and attaches its `onChange` handler, so `page.fill()` can land before the app is actually interactive and silently get ignored — I was mid-way through a retry-until-hydrated workaround when asked to stop. No numbers were captured. **This needs a quiet session to finish**, ideally also fixing the `vinext start` / `wrangler`-runtime gap so measurement can run against an actual production build instead of dev mode (dev mode numbers would be inflated relative to what users see — unminified JS, source maps, HMR client).
2. **`app/page.tsx` and `app/patch-notes/page.tsx` duplicate mobile/desktop DOM trees** — confirmed still present exactly as `AGENT_AUDIT.md` described (`hidden lg:block` / `lg:hidden` full copies in `app/page.tsx:34-153`; `MobileReleaseBrowser` unconditionally mounted alongside a `hidden lg:block` `PatchNotesBrowser` in `app/patch-notes/page.tsx:45`). Confirmed no e2e test depends on the `data-device-version`/`data-home-surface` attributes (`grep -r` came back empty), so it's safe to consolidate. I deliberately deferred this: it's a real but *measured-as-currently-unquantified* cost (the two versions render the same hero image file, so it's not double network bytes — the cost is doubled React trees/hydration work), and the task was explicit about not cutting things without measuring first. Should be sized against real CWV numbers (item 1) before deciding whether it's worth the refactor risk.
3. **`PublicBrandingGuard` / `MotionOrchestrator` observer scope** — both already batch via `requestAnimationFrame` (better than the audit implied), but both still observe the whole document/body rather than a container scoped to where they're actually needed. Same reasoning as item 2: real fix, but sizing it needs the CWV harness from item 1 to show whether it's actually visible in TBT/INP during chat streaming, versus already negligible now that the batching is in place.
4. **Priority-3 items not reached:** `RewardedAdGate.tsx` keyboard-open behavior (it uses the same `max-h-[100dvh]` + `overflow-y-auto` single-panel pattern that TermsGate had *before* my fix — spot-checked the CSS, structurally similar risk, but the ad flow's content is much shorter than the legal text so it may not actually overflow in practice; not visually verified). `ai-chat-input.tsx` safe-area behavior at 360–430px was not separately walked (it's Codex's file; the existing e2e mobile-composer-no-overflow test covers it indirectly and passes, but I didn't do a dedicated safe-area/notch check). `MobileHistory.tsx` dead-code status not checked.

## Findings outside my zone (for the owner / Codex)

- `components/playground/ErmaNovaWorkspace.tsx:91-108` — the "Runs" tab visual-selection bug `AGENT_AUDIT.md` flagged is still present: there's no `workspace-tab-runs` button, so when `onOpenRuns()` sets the active tab to `"runs"`, the tab bar's `selected` check (`tab === id || (tab === "runs" && id === "flow")`) makes the **Flow** tab visually appear selected while the **Runs** panel is actually showing. This file is in Codex's zone (desktop breakpoints/shared), not touched.
- The `v023.spec.mjs` root cause (item 4 under Fixes above) — worth Codex knowing that `ModelSelectorTrigger` and the attachment-menu trigger both carry bare `aria-expanded` with no `data-testid`, so any future test using a generic `[aria-expanded]` selector in the composer will have the same ambiguity. A `data-testid` on each would make this class of test bug impossible rather than just fixed once.

## Commits on `agent/mobile-overnight`

```
2cfbcb7 fix(mobile): 44px tap targets, trust-disclosure overlap, ignore test artifacts
5ebfac5 fix(mobile): keep TermsGate accept action inside the visual viewport
f1db1d6 chore: add @playwright/test devDependency for mobile browser verification
ed0fb8b baseline: agent_work snapshot before overnight work
```

No commit touches `lib/legal-documents.ts`, `lib/terms.ts`, `lib/policy-registry.ts`, `worker/*`, `db/*`, `drizzle/*`, `app/api/*`, `telegram-bot/*`, or `.github/workflows/*`. Nothing was pushed anywhere; no deploy was touched.
