# Release notes automation

New TK LAB release notes are maintained by Release Drafter instead of manually creating a new patch-note document for every change.

## Canonical source

GitHub Releases is the canonical source for new release drafts and published release notes. Files already present in `docs/releases/` remain a historical archive and do not define the next release.

Release Drafter configuration lives in `.github/release-drafter.yml`. The workflow is `.github/workflows/release-drafter.yml` and pins Release Drafter v7.7.0 to commit `34d80673e067bdc0c24568d3af899c216adcfaa9`.

## Automatic lifecycle

On pull-request activity the autolabeler classifies conventional fix/feature/docs work using the repository's existing `bug`, `enhancement`, and `documentation` labels.

After a pull request is merged to `main`, Release Drafter updates the next draft release automatically. The draft is named from semantic version resolution and is stored in GitHub Releases. Publishing remains an explicit maintainer action so a draft cannot silently become a production release or drift from the repository's release identity.

## Standard sections

Release entries are grouped into these stable headings:

- Security
- Hot Fixes
- Features
- Interface
- Documentation
- Dependencies
- Maintenance

Security, Interface, Documentation, and Dependencies can also be classified from changed paths. Hot Fixes use the existing `bug` label, and Features use `enhancement`.

A change labeled `skip-changelog` is excluded from the draft. A `major` label can be used deliberately to request a major semantic-version increment; otherwise Features resolve to a minor increment and the fallback is a patch increment.

## Pull request naming

Prefer conventional titles because they improve automatic classification:

- `fix: ...` or `hotfix: ...` for a regression or urgent correction
- `feat: ...` for a new capability
- `docs: ...` for documentation-only work

The autolabeler also recognizes matching branch prefixes such as `fix/`, `hotfix/`, `feat/`, `feature/`, and `docs/`.

## Public Patch Notes page

The in-product Patch Notes page keeps the existing historical release browser, but no longer duplicates generic “Open chat” calls to action. It links to GitHub Releases for the automatically maintained release stream.

Do not add another manually maintained current-release markdown file for routine patches. Historical release documents may still be added when a release needs long-form migration or incident documentation beyond the generated notes.
