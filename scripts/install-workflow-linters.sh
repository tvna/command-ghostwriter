#!/usr/bin/env bash
# SessionStart hook: provision the pinned actionlint AND shellcheck binaries
# onto PATH in Claude Code on the Web (CLAUDE_CODE_REMOTE=true) sessions.
# Refs #393 (retro #392 action 1; adapted from tvna/claude-md's
# install-actionlint.sh).
#
# Why both binaries: actionlint silently skips its shellcheck rules (e.g. the
# SC2086 finding that PR #391 only saw in CI) when no shellcheck binary is on
# PATH, so provisioning actionlint alone would NOT close the gap. The
# runner-bundled shellcheck is also unpinned, so we pin both.
#
# flake.nix is the single source of truth for version/asset/SHA256
# (actionlintVersion/actionlintNative, shellcheckVersion/shellcheckNative);
# scripts/flake_pin.py reads them at runtime so there is exactly one place to
# update on a bump. Every download is verified with `sha256sum -c` before
# install (supply-chain guard), and installs are atomic (mktemp + mv on one
# filesystem) so a concurrent reader never sees a half-written binary.
#
# Local dev and the nix devcontainer provision these tools via flake.nix
# (sharedPackages); this hook is a silent no-op there.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ] && [ "${CODEX_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/_session_path.sh
. "${SCRIPT_DIR}/_session_path.sh"

# Map this platform to the nix system double that flake.nix's *Native blocks
# enumerate. An unsupported arch is a non-fatal skip: the binaries are an
# enhancement, not a session prerequisite, so do not abort session startup.
arch="$(uname -m)"
nix_system=""
case "${arch}" in
  x86_64 | amd64) nix_system="x86_64-linux" ;;
  aarch64 | arm64) nix_system="aarch64-linux" ;;
  *)
    echo "install-workflow-linters: no pinned assets for arch '${arch}'; skipping." >&2
    exit 0
    ;;
esac

if ! command -v python3 >/dev/null 2>&1; then
  echo "install-workflow-linters: python3 is required to read the pins; skipping." >&2
  exit 0
fi

install_dir="${HOME}/.local/bin"
mkdir -p "${install_dir}"

# install_pinned <tool> <github-repo> <installed-version-command>
#   Resolve the tool's pin from flake.nix, reuse a matching binary already on
#   PATH, otherwise download + verify + atomically install it.
install_pinned() {
  local tool="$1" repo="$2" version_cmd="$3"
  local pin version asset sha dest url tmpdir tarball staged current

  pin="$(python3 "${SCRIPT_DIR}/flake_pin.py" resolve --tool "${tool}" --system "${nix_system}")"
  version="$(printf '%s\n' "${pin}" | sed -n '1p')"
  asset="$(printf '%s\n' "${pin}" | sed -n '2p')"
  sha="$(printf '%s\n' "${pin}" | sed -n '3p')"
  dest="${install_dir}/${tool}"

  # Idempotent: reuse a binary already on PATH at the pinned version (a prior
  # session-start run, or a nix-provisioned binary).
  if command -v "${tool}" >/dev/null 2>&1; then
    current="$(bash -c "${version_cmd}" 2>/dev/null || true)"
    if [ "${current}" = "${version}" ]; then
      echo "install-workflow-linters: ${tool} ${version} already present ($(command -v "${tool}"))" >&2
      return 0
    fi
  fi

  tmpdir="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '${tmpdir}'" RETURN
  tarball="${tmpdir}/${asset}"
  url="https://github.com/${repo}/releases/download/v${version}/${asset}"

  echo "install-workflow-linters: downloading pinned ${asset} v${version} ..." >&2
  curl -fsSL -o "${tarball}" "${url}"
  echo "${sha}  ${tarball}" | sha256sum -c - >&2

  # Archive layouts verified with scripts/inspect_release_archive.sh (#392):
  #   actionlint: flat archive, bare 'actionlint' binary at the top level
  #   sc (shellcheck): nested under shellcheck-v<version>/
  case "${tool}" in
    actionlint) tar -xzf "${tarball}" -C "${tmpdir}" actionlint ;;
    shellcheck) tar -xJf "${tarball}" -C "${tmpdir}" --strip-components=1 "shellcheck-v${version}/shellcheck" ;;
    *)
      echo "install-workflow-linters: ERROR: no extraction rule for '${tool}'." >&2
      return 1
      ;;
  esac
  if [ ! -f "${tmpdir}/${tool}" ]; then
    echo "install-workflow-linters: ERROR: ${asset} did not contain '${tool}'." >&2
    return 1
  fi

  staged="$(mktemp "${install_dir}/.${tool}.XXXXXX")"
  cp "${tmpdir}/${tool}" "${staged}"
  chmod 0755 "${staged}"
  mv -f "${staged}" "${dest}"
  echo "install-workflow-linters: ${tool} v${version} ready at ${dest}" >&2
}

install_pinned actionlint "rhysd/actionlint" "actionlint --version | head -1"
install_pinned shellcheck "koalaman/shellcheck" "shellcheck --version | sed -n 's/^version: //p'"

persist_session_path "${install_dir}"
