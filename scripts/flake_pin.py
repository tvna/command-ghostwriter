#!/usr/bin/env python3
"""Resolve fetchurl pins (version / asset / sha256) from flake.nix.

flake.nix is the single source of truth for the pinned version and per-system
SHA256 of the fetchurl-provisioned lint binaries (actionlint, shellcheck).
This stdlib-only reader exposes those pins to the non-nix consumers -- the
web-session installer (scripts/install-workflow-linters.sh) and the CI guard
job in reusable-test-and-build.yml -- so exactly one place defines each pin.

Minimal port of tvna/claude-md's flake_pin.py: only the ``resolve``
subcommand; the bump/asset-url update-path tooling is intentionally omitted
(YAGNI). Refs #393 (retro #392).

CLI:
    python3 scripts/flake_pin.py resolve --tool actionlint --system x86_64-linux
        -> three lines on stdout: version, asset filename, sha256 in hex

Failure policy: fails loud (exit != 0) when flake.nix is missing, a field
cannot be parsed, the hash is not SRI sha256, or the pinned version does not
appear in the asset filename (a version bump that forgot the asset line).
Never prints a guessed or partial result.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FLAKE_PATH = REPO_ROOT / "flake.nix"

KNOWN_TOOLS = ("actionlint", "shellcheck")


class PinError(Exception):
    """A pin could not be resolved from flake.nix."""


def sri_to_hex(sri: str) -> str:
    """Convert a nix SRI sha256 hash to lowercase hex for sha256sum -c."""
    if not sri.startswith("sha256-"):
        raise PinError(f"not an SRI sha256 hash: {sri!r}")
    try:
        digest = base64.b64decode(sri[len("sha256-") :], validate=True)
    except (binascii.Error, ValueError) as exc:
        raise PinError(f"invalid base64 in SRI hash {sri!r}: {exc}") from exc
    if len(digest) != 32:
        raise PinError(f"SRI sha256 digest must be 32 bytes, got {len(digest)}: {sri!r}")
    return digest.hex()


def read_pin(flake_text: str, tool: str, system: str) -> tuple[str, str, str]:
    """Return (version, asset, sha256-hex) for tool on system, or raise PinError."""
    version_match = re.search(rf'\b{re.escape(tool)}Version\s*=\s*"([^"]+)"\s*;', flake_text)
    if version_match is None:
        raise PinError(f"{tool}Version not found in flake.nix")
    version = version_match.group(1)

    block_match = re.search(
        rf"\b{re.escape(tool)}Native\s*=\s*\{{(.*?)\}}\.\$\{{system\}}\s*;",
        flake_text,
        re.DOTALL,
    )
    if block_match is None:
        raise PinError(f"{tool}Native block not found in flake.nix")

    entry_match = re.search(
        rf'\b{re.escape(system)}\s*=\s*\{{\s*asset\s*=\s*"([^"]+)"\s*;\s*hash\s*=\s*"([^"]+)"\s*;',
        block_match.group(1),
    )
    if entry_match is None:
        raise PinError(f"{tool}Native has no '{system}' entry with asset/hash")
    asset, sri = entry_match.groups()

    if version not in asset:
        raise PinError(f"{tool} pin is inconsistent: version {version!r} does not appear in asset {asset!r}")
    return version, asset, sri_to_hex(sri)


def main(argv: list[str] | None = None) -> int:
    """CLI entry point; prints version/asset/sha256-hex for the resolve subcommand."""
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    resolve = sub.add_parser("resolve", help="print version/asset/sha256-hex for a pinned tool")
    resolve.add_argument("--tool", required=True, choices=KNOWN_TOOLS)
    resolve.add_argument("--system", required=True)
    args = parser.parse_args(argv)

    if not FLAKE_PATH.is_file():
        print(f"flake_pin: flake.nix not found at {FLAKE_PATH}", file=sys.stderr)
        return 2
    try:
        version, asset, sha_hex = read_pin(FLAKE_PATH.read_text(encoding="utf-8"), args.tool, args.system)
    except PinError as exc:
        print(f"flake_pin: {exc}", file=sys.stderr)
        return 1
    print(version)
    print(asset)
    print(sha_hex)
    return 0


if __name__ == "__main__":
    sys.exit(main())
