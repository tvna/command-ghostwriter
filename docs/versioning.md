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

### Why the release needs a bypass actor

`@semantic-release/git` pushes the generated release commit directly to `main`
with `git push --tags HEAD:main`. When `main` carries a repository ruleset that
requires pull requests and verified signatures, that direct push is rejected
with `GH013` unless the pushing identity is on the ruleset **Bypass list**:

- **Changes must be made through a pull request** can only be satisfied by a
  bypass actor. Nothing in semantic-release turns its own direct push into a PR.
- **Commits must have verified signatures** is also waived for a bypass actor,
  because a ruleset bypass waives every rule in that ruleset at once. Signing the
  commit alone does not help while the pull-request rule is still enforced.

The default `GITHUB_TOKEN` runs as `github-actions[bot]`, which is never a bypass
actor, so a release run without `RELEASE_TOKEN` fails at the final push. The
workflow only pushes the single generated release commit; the synthetic
`develop` signal commits are discarded before the push.

### Configure `RELEASE_TOKEN` as a bypass actor

Pick one identity and add it to the `main` ruleset Bypass list
(Settings -> Rules -> Rulesets -> the `main` ruleset -> Bypass list):

- **GitHub App (preferred, permanent).** Create/install a repo-scoped App with
  Repository permissions `Contents: Read and write` and `Pull requests: Read and
  write`, and add the App to the Bypass list. Do NOT store a raw installation
  token: GitHub App installation access tokens expire after about one hour, so a
  static secret would break the daily scheduled release as soon as it ages out.
  Instead store the App's `app-id` and `private-key` as secrets and mint a fresh
  installation token inside the workflow before Checkout (for example with
  `actions/create-github-app-token`), then pass its output as the Checkout token
  and the `GITHUB_TOKEN` env. An App is not tied to a personal account and is the
  smallest durable bypass surface. The workflow as written consumes a single
  static `RELEASE_TOKEN` secret, which fits the PAT path below directly; choosing
  the App path additionally requires adding that token-minting step.
- **Fine-grained PAT (acceptable temporary workaround).** Create a fine-grained
  PAT scoped to this repository only, with `Contents: Read and write` and
  `Pull requests: Read and write`, a short expiry (<= 90 days), then add its owner
  to the Bypass list. Rotate before expiry and replace with the App when ready.

For the PAT path, store the token as the repository secret `RELEASE_TOKEN`
(Settings -> Secrets and variables -> Actions). For the App path, store the
`app-id` and `private-key` secrets instead and mint the token at runtime as
described above. Never paste a token or private key value into issues, PRs, logs,
or commits.

Grant only the two write permissions above; do not widen scope to chase the
push failure. A broad or long-lived bypass token is the main security risk here.

### Verify the handoff without exposing the secret

Run `Release` via `workflow_dispatch` from `main` and confirm the
`Run semantic-release` step reaches the push without a `GH013` rejection. A
missing or non-bypass token surfaces as the `remote rejected ... repository rule
violations` error, not as a leaked value, so the failure mode is safe to inspect.

Seed the baseline tag once after this release management change lands on `main`:

```bash
git tag v0.3.6
git push origin v0.3.6
```

The workflow refuses to run unless a `v`-prefixed semver tag already exists, so
a missing baseline fails loudly instead of accidentally publishing `1.0.0`.

[semantic-release]: https://github.com/semantic-release/semantic-release
