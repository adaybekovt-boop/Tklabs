# Release notes automation

New TK LAB release notes are maintained by Release Drafter instead of manually creating a new patch-note document for every routine change.

## Canonical source

GitHub Releases is the canonical source for new release drafts and published release notes. Files already present in `docs/releases/` remain a historical archive and do not define the next release.

Release Drafter configuration lives in `.github/release-drafter.yml`. The workflow is `.github/workflows/release-drafter.yml` and pins Release Drafter v7.7.0 to commit `34d80673e067bdc0c24568d3af899c216adcfaa9`.

## Bootstrap and automatic lifecycle

The repository can still have no published GitHub Release baseline even though source release history is newer. The current first-run bootstrap therefore maintains a draft `v0.20.9`, the completed Trust Architecture preview, while scanning changes only after the known v0.17.5 merge boundary (`2026-08-07T07:57:18Z`). This excludes older repository history and prevents Release Drafter from inventing an unrelated initial version.

The first-run bootstrap draft is never published automatically. Once a GitHub Release is explicitly published, subsequent runs use Release Drafter's normal semantic-version resolution from that published baseline.

On pull-request activity the autolabeler classifies conventional fix/feature/docs work using the repository's existing `bug`, `enhancement`, and `documentation` labels. After a pull request is merged to `main`, Release Drafter updates the next draft release automatically. Publishing remains an explicit maintainer action.

## Standard sections

Release entries are grouped into stable Security, Hot Fixes, Features, Interface, Documentation, Dependencies, and Maintenance headings. Security, Interface, Documentation, and Dependencies can be classified from changed paths; Hot Fixes use the existing `bug` label and Features use `enhancement`.

## Pull request naming

Prefer conventional titles because they improve automatic classification: `fix:` / `hotfix:` for regressions, `feat:` for capabilities, and `docs:` for documentation. Matching branch prefixes are also recognized.

## Public Patch Notes page

The in-product Patch Notes page retains historical releases, includes every `v0.19.0–v0.19.7` Workspace Evolution stage, and now includes every `v0.20.0–v0.20.9` Trust Architecture stage. It also links to GitHub Releases for the automatically maintained release stream.

`docs/releases/v0.20.9.md` is a long-form migration and preview-limit reference; it does not replace the generated GitHub release stream.
