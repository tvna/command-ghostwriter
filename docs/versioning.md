# Versioning

## Policy

This project uses [Semantic Versioning](https://semver.org/). Version strings in
files use bare `MAJOR.MINOR.PATCH`; git tags use the conventional `v` prefix
such as `v0.3.6`. The current version is tracked in `package.json`.

The project is still in initial development (`0.x.x`). `1.0.0` should be a
deliberate stability decision, not an accidental first semantic-release result.

## Single Source Of Truth

The git tag is the source of truth for releases. `package.json` and
`package-lock.json` are updated automatically during release preparation by
`scripts/apply_version.mjs`, then committed with the generated `CHANGELOG.md`.

Do not hand-edit the package version for routine releases. Land conventional
commits on `main`; the release workflow computes the next version from the
commits since the latest `vX.Y.Z` tag.

## Automated Releases

`.github/workflows/release.yml` runs semantic-release on a weekly schedule and
via `workflow_dispatch`. Plain pushes to `main` do not publish releases.

The release uses Conventional Commits:

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- Breaking changes create a minor release while the project remains below
  `1.0.0`.

When the project is ready for `1.0.0`, remove the breaking-change override from
`.releaserc.json` so semantic-release can return to the default
breaking-change-to-major behavior.

## Required Setup

Create a repository secret named `RELEASE_TOKEN` with permission to write
contents and pull requests. The workflow falls back to `GITHUB_TOKEN`, but that
token may not be able to push the release commit through branch protection.

Seed the baseline tag once after this release management change lands on `main`:

```bash
git tag v0.3.6
git push origin v0.3.6
```

The workflow refuses to run unless a `v`-prefixed semver tag already exists, so
a missing baseline fails loudly instead of accidentally publishing `1.0.0`.

[semantic-release]: https://github.com/semantic-release/semantic-release
