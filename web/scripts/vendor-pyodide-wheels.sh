#!/usr/bin/env bash
# Vendor the Python wheels that features/ needs into the local Pyodide
# distribution so the runtime can loadPackage() them fully offline. Refs #398.
#
# Why this exists:
#   - The npm `pyodide` package ships ONLY the core runtime (pyodide.asm.wasm,
#     python_stdlib.zip, pyodide-lock.json) -- ZERO wheels, not even micropip.
#   - At runtime Pyodide normally fetches wheels from cdn.jsdelivr.net, which is
#     403-blocked in the build/CI environment.
#   - The WASM wheels (PyYAML, pydantic_core, MarkupSafe) are
#     `pyodide_2024_0_wasm32` builds that exist ONLY in the official Pyodide
#     distribution; PyPI has no such wheels. They are obtained here from the
#     official Pyodide GitHub release tarball (reachable), not the CDN.
#   - chardet is not in the Pyodide distribution; its pure-python wheel
#     (5.2.0, matching the repo pin chardet>=5.2,<6 and uv.lock) comes from PyPI
#     and is registered into the local pyodide-lock.json so loadPackage resolves it.
#
# Idempotent: re-running is a no-op once the wheels and the chardet lock entry
# are present. node_modules/pyodide is gitignored and rebuilt by `npm install`,
# so this runs as a setup step (npm postinstall / SessionStart), not a commit.
#
# Exit non-zero (set -e) on any download/checksum/extraction failure -- fail
# loudly; never leave a half-provisioned distribution behind.
set -euo pipefail

PYODIDE_VERSION="0.26.4"
RELEASE_TARBALL="pyodide-${PYODIDE_VERSION}.tar.bz2"
RELEASE_URL="https://github.com/pyodide/pyodide/releases/download/${PYODIDE_VERSION}/${RELEASE_TARBALL}"

# Pure-python chardet wheel pinned to match the repo (chardet>=5.2,<6) and uv.lock.
CHARDET_WHEEL="chardet-5.2.0-py3-none-any.whl"
CHARDET_URL="https://files.pythonhosted.org/packages/38/6f/f5fbc992a329ee4e0f288c1fe0e2ad9485ed064cac731ed2fe47dcc38cbf/${CHARDET_WHEEL}"
CHARDET_SHA256="e1cf59446890a00105fe7b7912492ea04b6e6f06d4b742b2c788469e34c82970"

# Wheels to pull out of the release tarball (paths inside the `pyodide/` member).
# Exact filenames are pinned by node_modules/pyodide/pyodide-lock.json.
RELEASE_WHEELS=(
  "micropip-0.6.0-py3-none-any.whl"
  "packaging-23.2-py3-none-any.whl"
  "Jinja2-3.1.3-py3-none-any.whl"
  "MarkupSafe-2.1.5-cp312-cp312-pyodide_2024_0_wasm32.whl"
  "PyYAML-6.0.1-cp312-cp312-pyodide_2024_0_wasm32.whl"
  "pydantic-2.7.0-py3-none-any.whl"
  "pydantic_core-2.18.1-cp312-cp312-pyodide_2024_0_wasm32.whl"
  "annotated_types-0.6.0-py3-none-any.whl"
  "typing_extensions-4.11.0-py3-none-any.whl"
)

# Resolve the local Pyodide distribution directory from web/node_modules.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
web_dir="$(cd "${script_dir}/.." && pwd)"
dist_dir="${web_dir}/node_modules/pyodide"
lock_file="${dist_dir}/pyodide-lock.json"

if [ ! -f "${lock_file}" ]; then
  echo "error: ${lock_file} not found; run 'npm install' in web/ first" >&2
  exit 1
fi

have_all_release_wheels=1
for whl in "${RELEASE_WHEELS[@]}"; do
  [ -f "${dist_dir}/${whl}" ] || have_all_release_wheels=0
done

if [ "${have_all_release_wheels}" -eq 0 ]; then
  echo "vendoring ${#RELEASE_WHEELS[@]} wheels from Pyodide ${PYODIDE_VERSION} release ..."
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT
  curl -fsSL -m 600 -o "${tmp}/${RELEASE_TARBALL}" "${RELEASE_URL}"
  members=()
  for whl in "${RELEASE_WHEELS[@]}"; do members+=("pyodide/${whl}"); done
  # Single top-level dir `pyodide/`; --strip-components=1 lands wheels directly.
  tar -xjf "${tmp}/${RELEASE_TARBALL}" -C "${dist_dir}" --strip-components=1 "${members[@]}"
  for whl in "${RELEASE_WHEELS[@]}"; do
    [ -f "${dist_dir}/${whl}" ] || { echo "error: ${whl} missing after extract" >&2; exit 1; }
  done
  echo "release wheels vendored."
else
  echo "release wheels already present; skipping."
fi

# chardet pure-python wheel from PyPI, checksum-verified.
if [ ! -f "${dist_dir}/${CHARDET_WHEEL}" ]; then
  echo "downloading ${CHARDET_WHEEL} ..."
  curl -fsSL -m 120 -o "${dist_dir}/${CHARDET_WHEEL}" "${CHARDET_URL}"
fi
actual_sha="$(sha256sum "${dist_dir}/${CHARDET_WHEEL}" | cut -d' ' -f1)"
if [ "${actual_sha}" != "${CHARDET_SHA256}" ]; then
  echo "error: ${CHARDET_WHEEL} sha256 mismatch: ${actual_sha} != ${CHARDET_SHA256}" >&2
  rm -f "${dist_dir}/${CHARDET_WHEEL}"
  exit 1
fi

# Register chardet in the local lock so loadPackage(["chardet"]) resolves offline.
python3 - "${lock_file}" "${dist_dir}/${CHARDET_WHEEL}" "${CHARDET_SHA256}" <<'PY'
import json, sys
lock_file, wheel_path, sha = sys.argv[1], sys.argv[2], sys.argv[3]
with open(lock_file) as fh:
    lock = json.load(fh)
wheel_name = wheel_path.rsplit("/", 1)[-1]
lock["packages"]["chardet"] = {
    "name": "chardet",
    "version": "5.2.0",
    "file_name": wheel_name,
    "install_dir": "site",
    "sha256": sha,
    "package_type": "package",
    "imports": ["chardet"],
    "depends": [],
    "unvendored_tests": False,
}
with open(lock_file, "w") as fh:
    json.dump(lock, fh)
print("chardet registered in", lock_file)
PY

echo "Pyodide wheel vendoring complete."
