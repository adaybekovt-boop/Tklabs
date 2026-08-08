# Release notes automation

New TK LAB release notes are maintained by Release Drafter instead of manually creating a new patch-note document for every change.

## Canonical source

GitHub Releases is the canonical source for new release drafts and published release notes. Files already present in `docs/releases/` remain a historical archive and do not define the next release.

Release Drafter configuration lives in `.github/release-drafter.yml`. The workflow is `.github/workflows/release-drafter.yml` and pins Release Drafter v7.7.0 to commit `34d80673e067bdc0c24568d3af899c216adcfaa9`.

## Bootstrap and automatic lifecycle

The repository still has no published GitHub Release baseline even though the source release history extends beyond v0.17.5. The current first-run bootstrap therefore maintains a draft `v0.19.7`, the completed Workspace Evolution preview requested for this major cycle, while scanning changes only after the known v0.17.5 merge boundary (`2026-08-07T07:57:18Z`). This keeps older repository history out of the new draft and prevents Release Drafter from inventing an unrelated initial version.

The first-run bootstrap draft is never published automatically. Once a GitHub Release is explicitly published, subsequent runs use Release Drafter's normal semantic version resolution from that published baseline.

On pull-request activity the autolabeler classifies conventional fix/feature/docs work using the repository's existing `bug`, `enhancement`, and `documentation` labels.

After a pull request is merged to `main`, Release Drafter updates the next draft release automatically. Publishing remains an explicit maintainer action so a draft cannot silently become a production release.

## Standard sections

Release entries are grouped into these stable headings:

- Security
- Hot Fixes
- Features
- Interface
- Documentation
- Dependencies
- Maintenance

Security, Interface, Documentation, and Dependencies can be classified from changed paths. Hot Fixes use the existing `bug` label, and Features use `enhancement`. Feature entries request a minor semantic-version increment; all other categories default to a patch increment.

## Pull request naming

Prefer conventional titles because they improve automatic classification:

- `fix: ...` or `hotfix: ...` for a regression or urgent correction
- `feat: ...` for a new capability
- `docs: ...` for documentation-only work

The autolabeler also recognizes matching branch prefixes such as `fix/`, `hotfix/`, `feat/`, `feature/`, and `docs/`.

## Public Patch Notes page

The in-product Patch Notes page keeps the historical release browser and now includes the individual v0.19.0–v0.19.7 Workspace Evolution stages. It also links to GitHub Releases for the automatically maintained release stream.

Do not add another manually maintained current-release markdown file for routine patches. Historical release documents may still be added when a release needs long-form migration or incident documentation beyond the generated notes.
