#!/usr/bin/env bash
# Preflight inspection for release archives. Refs #393 (retro #392 action 2).
#
# Inspect the REAL structure of a (pinned) release archive BEFORE authoring
# any extraction logic. The PR #391 Job B repair (exit 127: the apm binary was
# not at the assumed path because the archive nests everything under
# apm-linux-x86_64/) is the bug class this preflight prevents: run this first,
# read the listing, then encode --strip-components / member paths from the
# observed layout, not from assumption.
#
# Usage:
#   scripts/inspect_release_archive.sh <url-or-path> [--sha256 <hex>] [--expect-path <member>]
#
#   <url-or-path>   release archive; a local file path is used as-is, anything
#                   else is downloaded with curl into a temp dir
#   --sha256 <hex>  verify the archive against this sha256 before inspecting
#   --expect-path   assert this exact member path exists in the archive
#                   (exit non-zero when absent)
#
# Supported formats: .tar.gz / .tgz / .tar.xz / .zip
set -euo pipefail

usage() {
  echo "usage: $0 <url-or-path> [--sha256 <hex>] [--expect-path <member>]" >&2
}

if [ "$#" -lt 1 ]; then
  usage
  exit 2
fi

src="$1"
shift
sha=""
expect=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --sha256)
      sha="${2:?--sha256 requires a hex digest}"
      shift 2
      ;;
    --expect-path)
      expect="${2:?--expect-path requires a member path}"
      shift 2
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

if [ -f "${src}" ]; then
  archive="${src}"
else
  archive="${tmpdir}/$(basename "${src}")"
  echo "inspect_release_archive: downloading ${src} ..." >&2
  curl -fsSL -o "${archive}" "${src}"
fi

if [ -n "${sha}" ]; then
  echo "${sha}  ${archive}" | sha256sum -c - >&2
fi

case "${archive}" in
  *.tar.gz | *.tgz) listing="$(tar -tzf "${archive}")" ;;
  *.tar.xz) listing="$(tar -tJf "${archive}")" ;;
  *.zip) listing="$(python3 -c 'import sys, zipfile; print("\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))' "${archive}")" ;;
  *)
    echo "inspect_release_archive: unsupported archive extension: ${archive}" >&2
    exit 2
    ;;
esac

echo "== top-level entries =="
printf '%s\n' "${listing}" | cut -d/ -f1 | sort -u
echo
total="$(printf '%s\n' "${listing}" | wc -l)"
echo "== first 40 of ${total} members =="
printf '%s\n' "${listing}" | head -40

if [ -n "${expect}" ]; then
  if printf '%s\n' "${listing}" | grep -Fxq -- "${expect}"; then
    echo "OK: member '${expect}' exists in the archive"
  else
    echo "inspect_release_archive: ERROR: expected member '${expect}' not found in the archive." >&2
    echo "inspect_release_archive: write extraction logic from the listing above, not from assumption." >&2
    exit 1
  fi
fi
