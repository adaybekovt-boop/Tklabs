# v0.9.1 merge gate

This branch is not ready to merge merely because source tests pass.

Required final gate:

- GitHub Validate green on final HEAD.
- Desktop browser smoke test confirms the textarea is visible and typeable at 1280×720 and 1366×768.
- Mobile browser smoke test confirms the composer remains above the keyboard at 360×640 and 390×844.
- History, model, and attachment overlays leave no stale click-blocking backdrop.
- Existing Patch Notes page includes the v0.9.1 RU/EN release entry.
- Required reviewer approval obtained.
- Squash merge only.
- Validate and Deploy Cloudflare Worker green on the merge commit.
