# Switch automated PR creation to a GitHub App token

Refs #511. Upstream reference: `tvna/claude-md`.

## Problem

Automated PRs created with the default `GITHUB_TOKEN` (author
`github-actions[bot]`) get stuck in `mergeable_state: blocked`
(observed on PR #510, from the `sync-apm-skills` job).

Two root causes:

1. A PR created via `GITHUB_TOKEN` does not fire `on: pull_request`
   events (GitHub's recursion guard). The required status checks defined
   in `test-and-build-on-pr.yml` therefore never run, stay pending, and
   the PR is blocked forever.
2. The author/committer identity is the generic `github-actions[bot]`,
   which does not line up cleanly with signed-commit branch protection.

## Decision

Mirror upstream `tvna/claude-md`: mint a short-lived GitHub App token
with `actions/create-github-app-token` and use that token to author the
PR. Use the **same GitHub App** as upstream. App-token PRs get a proper
App-bot author, Verified commits, and DO trigger downstream CI, which
clears the blocked state.

## Scope

Three PR-creating jobs across two workflows switch from `GITHUB_TOKEN`
to an App token:

| Workflow | Job | Mechanism | Change |
| --- | --- | --- | --- |
| `sync-agent-instructions.yml` | `sync-claude-md` | `peter-evans/create-pull-request` | mint App token; `token:` -> App token; keep `sign-commits: true` |
| `sync-agent-instructions.yml` | `sync-apm-skills` | `peter-evans/create-pull-request` | same as above |
| `test-and-build-on-push.yml` | `create-pr-to-main` | `github-script` `pulls.create` | mint App token; PR-creating step `github-token:` -> App token |

Each job gains one step before its PR-creating step:

```yaml
- name: Mint GitHub App token
  id: app-token
  uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
  with:
    app-id: ${{ secrets.AUTOMATION_APP_ID }}
    private-key: ${{ secrets.AUTOMATION_APP_PRIVATE_KEY }}
```

The action version is pinned to the same SHA upstream uses (v3.2.0).

`sign-commits: true` is retained on the peter-evans steps: with an App
token, the commit is created through the GitHub API and shows Verified
under the App identity.

For `create-pr-to-main`, only the `create-pr-script` step (which calls
`pulls.create` and adds labels to the new PR) switches to the App token,
so the PR is authored by the App bot and triggers CI. The read-only
`check-pr`, `ensure-labels`, and `set-status` steps stay on
`GITHUB_TOKEN` (minimal change; no author sensitivity there).

## Secrets (operator action, cannot be automated)

New repo secrets holding the **same App** as upstream:

- `AUTOMATION_APP_ID` - the GitHub App's numeric App ID.
- `AUTOMATION_APP_PRIVATE_KEY` - the App's PEM private key.

Issuance / handoff path:

- Install the same GitHub App on `tvna/command-ghostwriter`.
- Minimum App permissions: Contents = write, Pull requests = write,
  Issues = write (labels).
- Store the two values as repository (or org) Actions secrets. The PEM is
  never echoed into logs; `create-github-app-token` masks the minted
  token automatically.
- Rotation: follows the App's private-key rotation; no extra cadence
  introduced here.
- Verification of handoff: run `Sync agent instructions` via
  `workflow_dispatch`. The resulting PR must be authored by the App bot,
  show Verified commits, and trigger the required PR CI. If the token
  cannot be minted (missing/invalid secret), the job fails loudly at the
  mint step rather than silently falling back.

## Harden-runner

`create-github-app-token` calls `api.github.com:443`. The
`create-pr-to-main` job already allow-lists `api.github.com:443` and
`github.com:443`. The `sync-agent-instructions.yml` jobs run
`egress-policy: audit` (non-blocking), so no allow-list change is needed.

## Non-goals

- No change to the sync/release logic itself, only the token used to
  author PRs.
- No move away from `peter-evans/create-pull-request` to a GraphQL
  `createCommitOnBranch` flow (upstream uses that for a different job;
  keeping peter-evans is the smaller, equivalent-outcome change here).

## Verification

Static: `actionlint` / YAML parse on the two workflows (CI:
`verify-superpowers.yml` and existing workflow linting).

Behavioral (requires the secrets to exist, so it runs post-merge by the
operator): `workflow_dispatch` of `Sync agent instructions` produces a
PR authored by the App bot with Verified commits and triggered CI. This
behavioral check cannot run in this environment because the secrets are
not available here; that limitation is stated up front.
