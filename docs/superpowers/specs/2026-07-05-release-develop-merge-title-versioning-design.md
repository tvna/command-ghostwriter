# Release Develop Merge Title Versioning Design

## Context

The repository already uses semantic-release from the `Release` workflow. The
release tag is the source of truth, and semantic-release prepares
`package.json`, `package-lock.json`, `CHANGELOG.md`, the git tag, and the
GitHub Release from `main`.

The missing behavior is the release signal. Routine development lands on
`develop`, but the current release job only analyzes commits available to the
semantic-release run on `main`. That leaves version selection dependent on
manual version edits or on commit history that may not reflect the merge titles
used for the development branch.

Issue: #521.

## Goals

- Run the `Release` workflow automatically every day at 06:00 JST.
- Keep releases, tags, changelog updates, and package version commits on `main`.
- Derive the semantic-release bump signal from merge titles that landed on
  `develop` since the previous `vX.Y.Z` release tag.
- Preserve the existing baseline tag guard and semantic-release plugin flow.
- Cover the workflow and release-signal preparation behavior with deterministic
  tests.

## Non-Goals

- Do not move the release branch from `main` to `develop`.
- Do not replace semantic-release with a custom release publisher.
- Do not require GitHub API access for the first implementation.
- Do not hand-edit package versions for routine releases.

## Recommended Approach

Add a small release-preparation script that converts eligible `develop` merge
titles into a temporary commit range semantic-release can analyze.

The workflow stays anchored on `main`. After checkout, it fetches the full
`develop` history and tags. A preparation step finds the latest `vX.Y.Z` tag,
reads merge commits reachable from `origin/develop` after that tag, extracts the
merge titles, and creates release-signal commits on a temporary local branch.
Those commits use Conventional Commit subjects, so the existing
`@semantic-release/commit-analyzer` and release notes generator can compute the
next version without replacing the release engine.

This avoids depending on the GitHub API, keeps all published release artifacts on
`main`, and limits new logic to one auditable bridge between `develop` merge
history and semantic-release's expected input.

## Data Flow

1. `Release` starts by schedule or manual dispatch.
2. The workflow checks out `main` with full history and the release token.
3. The workflow fetches `origin/develop` and tags.
4. The baseline tag guard fails if no `v`-prefixed semver tag exists.
5. The preparation script locates the latest release tag.
6. The script reads merge commit subjects from `origin/develop` after that tag.
7. Eligible titles are normalized into Conventional Commit subjects.
8. The script creates local synthetic commits on top of `main`.
9. semantic-release analyzes those local commits, computes the next version, and
   runs the existing changelog, version update, git, and GitHub release plugins.
10. Only semantic-release's normal release commit and tag are pushed to `main`.

## Title Selection Rules

The first implementation should prefer explicit Conventional Commit titles:

- `fix:` creates a patch release.
- `feat:` creates a minor release.
- titles with `!` or `BREAKING CHANGE` create a minor release while the project
  remains below `1.0.0`, matching the current `.releaserc.json` rule.

Common GitHub merge commit wrappers should be unwrapped when possible. For
example, `Merge pull request #123 from owner/branch` can be paired with the next
subject line if available in the merge commit body. Squash or rebase style
commits that already use a Conventional Commit subject are accepted directly.

Titles that do not map to a release type are ignored. If no eligible title is
found, semantic-release should produce no release.

## Workflow Changes

`.github/workflows/release.yml` changes:

- Schedule cron becomes `0 21 * * *`, which is 06:00 JST.
- The comment should name both UTC and JST times.
- Add a fetch/preparation step before `Run semantic-release`.
- Keep `workflow_dispatch`.
- Keep no `push` or `pull_request` release trigger.
- Keep the baseline tag guard before release analysis.

## Components

`scripts/prepare_release_commits.mjs`:

- Inputs:
  - release branch HEAD from the current checkout.
  - develop ref, defaulting to `origin/develop`.
  - latest release tag discovered from local tags.
- Outputs:
  - local synthetic Conventional Commit commits when release-worthy develop
    merge titles exist.
  - no commits when no release-worthy titles exist.
- Failure behavior:
  - fail loudly if `origin/develop` is missing.
  - fail loudly if no baseline tag is present.
  - fail loudly if git commands fail.

Tests:

- Workflow test asserts the 06:00 JST cron.
- Workflow test asserts `develop` is fetched/prepared before semantic-release.
- Script tests use a temporary git repository to cover patch, minor, breaking,
  ignored title, and missing develop-ref behavior.
- Existing `apply_version` tests remain unchanged.

Docs:

- `docs/versioning.md` explains that release signals come from `develop` merge
  titles while release artifacts remain on `main`.
- The document includes examples of titles that produce patch, minor, and no
  release.

## Risks And Mitigations

- Risk: merge commits may not contain the PR title in the subject.
  Mitigation: inspect both subject and body lines and document the supported
  merge styles.
- Risk: synthetic commits might be pushed accidentally.
  Mitigation: only semantic-release pushes its configured assets and tag; the
  preparation commits are local inputs. Tests assert the workflow still invokes
  semantic-release through the existing release step.
- Risk: non-Conventional titles are silently ignored.
  Mitigation: the script prints a summary of accepted and ignored titles without
  exposing secrets.

## Acceptance Criteria

- `Release` runs daily at 06:00 JST and remains manually dispatchable.
- The workflow remains release-only: no push or pull request trigger.
- The release job analyzes `develop` merge titles since the latest release tag.
- semantic-release still owns version calculation, changelog generation, package
  version updates, release commits, tags, and GitHub Releases.
- Tests cover workflow schedule, develop preparation, and merge-title conversion
  behavior.
- `docs/versioning.md` reflects the new release policy.
