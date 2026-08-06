# Luna — finish and merge the v0.9.1 chat hotfix

Repository: `adaybekovt-boop/Tklabs`

Use only the existing branch:

```text
fix/chat-ui-regression-v0.9.1
```

Do not create another branch. Do not restore the v0.9.0 viewport code. Do not weaken authentication, provider safety, reasoning privacy, rate limits, attachment limits, or Cloudflare deployment checks.

## Already implemented

- Removed the nested full-viewport minimum height that pushed the desktop composer below the screen.
- Restricted `visualViewport` sizing to mobile/coarse-pointer layouts.
- Removed the duplicate global header in Playground chat mode.
- Portaled overlays to `document.body` with focus trap, Escape, focus restoration, and body scroll locking.
- Rebuilt the composer with stable dimensions.
- Separated Voice from Send/Stop.
- Prevented empty Send from requesting microphone permission.
- Made submission return an accepted boolean before clearing the draft and attachments.
- Collapsed secondary Learn/Write/reasoning/tone controls.
- Moved Jump to latest outside transcript flow.
- Added hotfix documentation and bilingual v0.9.1 release text.

Current branch commits were validated during implementation. Re-run validation against the final HEAD.

## Required work before merge

1. Pull the latest branch HEAD.
2. Inspect the full diff against `main`.
3. Integrate the v0.9.1 RU/EN text from `PATCH_NOTES_V0.9.1.md` into the existing real Patch Notes page/dictionaries. Remove the standalone staging file afterward if it is not part of the project convention.
4. Add or update focused tests for these invariants:
   - Playground workspace has `h-full min-h-0` and no nested `--chat-visual-height` inline min-height.
   - chat mode does not render the normal site header.
   - visual viewport sizing does not affect desktop.
   - overlays use `createPortal(..., document.body)`.
   - empty Send never calls voice input.
   - Voice and Send/Stop are separate buttons.
   - rejected/pending submission does not clear the draft.
5. Run a production-like browser smoke test. At minimum:
   - desktop 1280×720 and 1366×768: textarea visible, clickable, typeable, and fully inside viewport;
   - mobile 360×640 and 390×844: composer remains visible above the keyboard/safe area;
   - open and close history, model picker, and attachment preview, then confirm textarea remains clickable;
   - Enter sends on desktop, Shift+Enter adds a newline, mobile Enter adds a newline;
   - Stop preserves text typed while generation is active;
   - no horizontal overflow.
6. Fix only defects found by those tests in this same branch.
7. Run:

```bash
npm ci
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm test
AUTH_URL=https://tklabs.uk AUTH_TRUST_HOST=true npm run build
npx wrangler deploy --dry-run --config dist/server/wrangler.json
git diff --check
```

8. Create or update one PR from `fix/chat-ui-regression-v0.9.1` to `main` with title:

```text
fix: restore chat composer and simplify chat UI
```

9. In the PR body record:
   - root cause;
   - final HEAD SHA;
   - exact checks and browser viewports tested;
   - screenshots if available;
   - any remaining limitation.
10. When all checks are green and browser smoke tests pass, mark the PR Ready for review.
11. Obtain the required approval if branch protection requires it.
12. Squash and merge into `main`.
13. Monitor both `Validate` and `Deploy Cloudflare Worker` for the merge commit.
14. After successful deploy, smoke-test `https://tklabs.uk/playground` on desktop and mobile.
15. If production composer is not visible/clickable, stop and revert the hotfix merge; do not keep patching production blindly.

Do not claim browser checks passed unless they were actually run. Do not merge with a failing check.
