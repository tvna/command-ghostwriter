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

Do not hand-edit the package version for routine releases. Land release-worthy
titles on `develop`; the release workflow converts those titles into local
semantic-release input commits while publishing the release from `main`.

## Automated Releases

`.github/workflows/release.yml` runs semantic-release every day at 06:00 JST and
via `workflow_dispatch`. Plain pushes to `main` do not publish releases.

Release artifacts remain on `main`, but the release signal comes from
first-parent titles that landed on `develop`. Before semantic-release runs,
`scripts/prepare_release_commits.mjs` reads the `develop` history, unwraps
common GitHub merge commit bodies when needed, and creates local synthetic
Conventional Commit inputs on top of the checked-out `main` branch.

Those synthetic commits are temporary analysis inputs only. During release
preparation, `scripts/apply_version.mjs` restores `HEAD` to the original `main`
checkout before `@semantic-release/git` creates the release commit. This keeps
the pushed `main` history limited to the normal release commit instead of
publishing the synthetic inputs.

Each release records the source `develop` commit SHAs in `.release-signals.json`.
Later scheduled runs read that metadata from the latest release tag and skip
already released `develop` commits, so old titles do not trigger a new release
every morning. Historical `Release-Signal-Source:` commit markers are still
recognized for compatibility.

The release uses Conventional Commit titles:

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- Breaking changes create a minor release while the project remains below
  `1.0.0`.
- Non-release titles such as `docs:` or `chore:` are ignored for version bump
  purposes.

When the project is ready for `1.0.0`, remove the breaking-change override from
`.releaserc.json` so semantic-release can return to the default
breaking-change-to-major behavior.

## Required Setup

Create a repository secret named `RELEASE_TOKEN` with permission to write
contents and pull requests. The workflow falls back to `GITHUB_TOKEN`, but that
token may not be able to push the release commit through branch protection.
When `main` is protected by repository rules, the release actor must either be
allowed to bypass the pull-request requirement and signature requirement, or it
must create verified commits that satisfy those rules. The release workflow only
pushes the generated release commit; synthetic `develop` signal commits are
discarded before the push.

Seed the baseline tag once after this release management change lands on `main`:

```bash
git tag v0.3.6
git push origin v0.3.6
```

The workflow refuses to run unless a `v`-prefixed semver tag already exists, so
a missing baseline fails loudly instead of accidentally publishing `1.0.0`.

[semantic-release]: https://github.com/semantic-release/semantic-release
