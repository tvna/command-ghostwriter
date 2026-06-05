# devcontainer 再構成 + nix flake 実装計画 (PR2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** リファレンス `tvna/claude-md` を踏襲し、Claude/Codex 両対応の build-on-open 開発コンテナ（nix flake でツール固定）へ `.devcontainer` を再構成する。egress allowlist は含めない（Issue #336）。

**Architecture:** base `ubuntu-24.04` + devcontainer の nix feature + カスタム `agent-user` feature でコンテナ起動時にビルド。`flake.nix` が uv/gh/python/claude-cli/codex-cli/apm を固定し、`postCreate` で `uv sync --locked --group local` とエージェント CLI 導入を行う。ghcr 事前ビルドは使わない。

**Tech Stack:** Dev Containers, nix flakes (nixos-25.05), uv, Podman/Docker

**関連:** Issue #335 / 設計書 `docs/superpowers/specs/2026-06-04-devcontainer-rework-design.md`
**前提:** PR1（uv 化）がマージ済みで `pyproject.toml` に `[tool.uv]`・`uv.lock` が存在すること。

**検証の限界（重要）:** 本作業環境には nix が未導入のため、`flake.nix` の実ビルド・`flake.lock` 生成・コンテナ実起動は**本環境で検証できない**。本計画では (a) 本環境で可能な静的検証（JSON/TOML/シェル構文・shellcheck）と、(b) nix 対応ホストで実行する具体的コマンドを分離して記す。後者は実装担当が nix 対応ホスト（実 devcontainer）で実施する。

**コミット規約:** 各コミット末尾に `(#335)`。author は `Claude <noreply@anthropic.com>`。

---

## ファイル構成（新規/変更）

- Create: `flake.nix`, `flake.lock`
- Delete: `.devcontainer/Dockerfile`, `.devcontainer/devcontainer.json`（旧単一構成）
- Create: `.devcontainer/claude/devcontainer.json`, `.devcontainer/codex/devcontainer.json`
- Create: `.devcontainer/images/features/agent-user/{devcontainer-feature.json,install.sh}`
- Create: `.devcontainer/config/claude/settings.json`, `.devcontainer/config/codex/config.toml`
- Create: `.devcontainer/config/profile.d/{command-ghostwriter-nix-path.sh,command-ghostwriter-agent-prompt.sh}`
- Create: `.devcontainer/scripts/{check-gh-config-permissions.sh,prepare-agent-workspace.sh,install-agent-cli.sh,configure-agent-runtime.sh}`

---

## Task 1: flake.nix を作成

**Files:**
- Create: `flake.nix`

- [ ] **Step 1: flake.nix を作成**

以下を `flake.nix` として作成する。claude-cli / codex-cli / apm の version・hash はリファレンス（同一の上流アーティファクト）の検証済み値を流用。`pinned-uv` の `hash` のみ Task 2 で nix ホストにて確定する（uv のバージョンが本リポジトリ固有の `==0.8.17` のため）。

```nix
{
  description = "Pinned devcontainer toolchains for command-ghostwriter agent workspaces";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { nixpkgs, ... }:
    let
      systems = [ "aarch64-linux" "x86_64-linux" ];
      uvVersionSpec = (builtins.fromTOML (builtins.readFile ./pyproject.toml)).tool.uv.required-version;
      uvVersion =
        assert nixpkgs.lib.hasPrefix "==" uvVersionSpec;
        nixpkgs.lib.removePrefix "==" uvVersionSpec;
      forAllSystems = nixpkgs.lib.genAttrs systems;
      mkPackages = system:
        let
          pkgs = import nixpkgs { inherit system; };
          claudeCodeVersion = "2.1.154";
          codexCliVersion = "0.135.0";
          apmVersion = "0.12.1";
          claudeCodeNative = {
            aarch64-linux = { package = "claude-code-linux-arm64"; hash = "sha512-kUx+agGdSbKdSUPPWxq8O/4XsbGrMDQ89APe/vb4jvsCnt5hQAPWYd+gMaspL/QlvHd77wd8BJf5+fuqt5ck4g=="; };
            x86_64-linux = { package = "claude-code-linux-x64"; hash = "sha512-AQxDm3rhPLnS5DLKYYUUSC4G40Fgc/zD7yOSTFyGvLLtI7S9Enuj8ltxVNWAQqF5U6mdWvnjuu8hZS1Ftk1IaQ=="; };
          }.${system};
          codexCliNative = {
            aarch64-linux = { target = "aarch64-unknown-linux-musl"; packageVersion = "${codexCliVersion}-linux-arm64"; hash = "sha512-dM+cv5ZL+BgIQzEIvMg9AxZ98n5lkKLgtp5zJLXWSrbCllbnUSqxYMUiWI5c1a1uBDUtkbY9fcGKXFLf+d+gyg=="; };
            x86_64-linux = { target = "x86_64-unknown-linux-musl"; packageVersion = "${codexCliVersion}-linux-x64"; hash = "sha512-5EosY67yU28UJSnl/obdN2F1CDaimYbzm9SLR8dwwzkeBBnY6dHgAKJ2GTu9Nc8CmgmtVFBGzgPqehsIcueVvA=="; };
          }.${system};
          apmNative = {
            aarch64-linux = { archive = "apm-linux-arm64"; hash = "sha256-NkplG444MzHPCumW09V7fxZLON40VjSuCP5xFMT546c="; };
            x86_64-linux = { archive = "apm-linux-x86_64"; hash = "sha256-oLiW6MvdEEQRJemJqhnRgMYgUu2nyKqFD+s2eAXRJW8="; };
          }.${system};
          uvNative = {
            # Task 2 で nix ホストにて確定。プレースホルダのままビルドすると hash mismatch でわざと失敗する。
            aarch64-linux = { target = "aarch64-unknown-linux-gnu"; hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; };
            x86_64-linux = { target = "x86_64-unknown-linux-gnu"; hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; };
          }.${system};
          pinned-uv = pkgs.stdenvNoCC.mkDerivation {
            pname = "uv";
            version = uvVersion;
            src = pkgs.fetchurl {
              url = "https://releases.astral.sh/github/uv/releases/download/${uvVersion}/uv-${uvNative.target}.tar.gz";
              hash = uvNative.hash;
            };
            dontBuild = true;
            installPhase = ''
              runHook preInstall
              install -Dm755 uv $out/bin/uv
              install -Dm755 uvx $out/bin/uvx
              runHook postInstall
            '';
          };
          claude-cli = pkgs.stdenvNoCC.mkDerivation {
            pname = "claude-code-cli";
            version = claudeCodeVersion;
            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/@anthropic-ai/${claudeCodeNative.package}/-/${claudeCodeNative.package}-${claudeCodeVersion}.tgz";
              hash = claudeCodeNative.hash;
            };
            dontBuild = true;
            installPhase = ''
              runHook preInstall
              install -Dm755 claude $out/bin/claude
              runHook postInstall
            '';
          };
          codex-cli = pkgs.stdenvNoCC.mkDerivation {
            pname = "codex-cli";
            version = codexCliVersion;
            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/@openai/codex/-/codex-${codexCliNative.packageVersion}.tgz";
              hash = codexCliNative.hash;
            };
            dontBuild = true;
            installPhase = ''
              runHook preInstall
              mkdir -p $out/bin
              cp -R vendor $out/vendor
              chmod +x $out/vendor/${codexCliNative.target}/bin/codex
              cat > $out/bin/codex <<EOF
#!${pkgs.runtimeShell}
export PATH="$out/vendor/${codexCliNative.target}/codex-path:''${PATH:-}"
export CODEX_MANAGED_BY_NIX=1
export CODEX_MANAGED_PACKAGE_ROOT="$out"
exec "$out/vendor/${codexCliNative.target}/bin/codex" "\$@"
EOF
              chmod +x $out/bin/codex
              runHook postInstall
            '';
          };
          apm-cli = pkgs.stdenvNoCC.mkDerivation {
            pname = "apm-cli";
            version = apmVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/microsoft/apm/releases/download/v${apmVersion}/${apmNative.archive}.tar.gz";
              hash = apmNative.hash;
            };
            dontBuild = true;
            dontStrip = true;
            dontPatchELF = true;
            installPhase = ''
              runHook preInstall
              mkdir -p $out/libexec/apm $out/bin
              install -Dm755 apm $out/libexec/apm/apm
              cp -R _internal $out/libexec/apm/_internal
              cat > $out/bin/apm <<EOF
#!${pkgs.runtimeShell}
exec "$out/libexec/apm/apm" "\$@"
EOF
              chmod +x $out/bin/apm
              runHook postInstall
            '';
          };
        in
        {
          inherit claude-cli codex-cli pinned-uv apm-cli;
          bubblewrap = pkgs.bubblewrap;
          gh-cli = pkgs.gh;
          python-runtime = pkgs.python311;
        };
      mkShells = system:
        let
          pkgs = import nixpkgs { inherit system; };
          agentPackages = mkPackages system;
          sharedPackages = with pkgs; [
            bashInteractive cacert coreutils fd gh git jq nodejs_22 python311 ripgrep
            agentPackages.pinned-uv
          ];
          pythonQualityPackages = with pkgs; [ mypy ruff python311Packages.pytest-xdist ];
          networkPackages = with pkgs; [ dnsutils iproute2 iptables ];
          mkAgentShell = name: extraPackages:
            pkgs.mkShell {
              packages = sharedPackages ++ pythonQualityPackages ++ extraPackages;
              shellHook = ''export AGENT_CONTAINER="${name}"'';
            };
        in
        {
          default = mkAgentShell "shared" [ ];
          claude = mkAgentShell "claude" [ agentPackages.claude-cli pkgs.nodePackages.npm ];
          codex = mkAgentShell "codex" [ agentPackages.bubblewrap agentPackages.codex-cli pkgs.nodePackages.pnpm ];
          network = pkgs.mkShell { packages = networkPackages; };
        };
    in
    {
      packages = forAllSystems mkPackages;
      devShells = forAllSystems mkShells;
    };
}
```

備考: リファレンスの `waza-cli` は本リポジトリ未使用のため除外（YAGNI）。`network` devShell は #336 の受け皿として残す。

- [ ] **Step 2: 静的構文確認（本環境で可能な範囲）**

Run: `python3 -c "open('flake.nix').read(); print('exists')"` で存在確認。nix 構文チェックは nix が無いため不可（Task 2 でホスト確認）。

- [ ] **Step 3: コミット**

```bash
git add flake.nix
git commit -m "build: add nix flake pinning agent toolchains (#335)"
```

---

## Task 2: uv ハッシュ確定と flake.lock 生成（nix 対応ホストで実施）

**Files:**
- Modify: `flake.nix`（`uvNative` の hash 2件）
- Create: `flake.lock`

> このタスクは nix が必要。本作業環境では実行不可のため、実 devcontainer / nix 対応ホストで行う。

- [ ] **Step 1: uv 0.8.17 のソースハッシュを取得**

nix ホストで両アーキテクチャ分を取得:
```bash
for t in x86_64-unknown-linux-gnu aarch64-unknown-linux-gnu; do
  url="https://releases.astral.sh/github/uv/releases/download/0.8.17/uv-${t}.tar.gz"
  raw="$(nix-prefetch-url --type sha256 "$url")"
  echo "$t -> $(nix hash to-sri --type sha256 "$raw")"
done
```
Expected: `sha256-...=` 形式が2件出力される。

- [ ] **Step 2: flake.nix の uvNative hash を置換**

Step 1 の出力で `uvNative.aarch64-linux.hash` と `uvNative.x86_64-linux.hash` のプレースホルダ（`sha256-AAAA...`）を実値へ置換。

- [ ] **Step 3: flake.lock を生成**

Run: `nix flake lock`
Expected: `flake.lock` が生成される。

- [ ] **Step 4: 各 devShell をビルド検証**

Run: `nix develop .#claude --command true && nix develop .#codex --command true && nix develop .#network --command true`
Expected: いずれもエラーなく終了。

- [ ] **Step 5: コミット**

```bash
git add flake.nix flake.lock
git commit -m "build: pin uv source hash and lock flake inputs (#335)"
```

---

## Task 3: agent-user feature を作成

**Files:**
- Create: `.devcontainer/images/features/agent-user/devcontainer-feature.json`
- Create: `.devcontainer/images/features/agent-user/install.sh`

- [ ] **Step 1: feature メタデータを作成**

`.devcontainer/images/features/agent-user/devcontainer-feature.json`:
```json
{
  "id": "agent-user",
  "version": "1.0.0",
  "name": "Agent runtime user",
  "description": "Adds an agent-named UID 0 user for rootless Podman workspace mounts.",
  "options": {
    "agentUser": {
      "type": "string",
      "default": "codex",
      "description": "Agent user name to expose in the devcontainer."
    }
  }
}
```

- [ ] **Step 2: install.sh を作成**

`.devcontainer/images/features/agent-user/install.sh`（リファレンス踏襲）:
```sh
#!/usr/bin/env sh
set -eu

agent_user="${AGENTUSER:-}"

case "$agent_user" in
  claude | codex) ;;
  *)
    echo "unsupported agentUser: $agent_user" >&2
    exit 64
    ;;
esac

mkdir -p "/home/$agent_user"

awk -F: -v agent="$agent_user" '
  BEGIN { OFS = FS; print agent, "x", "0", "0", agent, "/home/" agent, "/bin/bash" }
  $1 != agent { print }
' /etc/passwd > /etc/passwd.new
cat /etc/passwd.new > /etc/passwd
rm /etc/passwd.new

awk -F: -v agent="$agent_user" '
  BEGIN { OFS = FS; print agent, "x", "0", "" }
  $1 != agent { print }
' /etc/group > /etc/group.new
cat /etc/group.new > /etc/group
rm /etc/group.new

chown -R 0:0 "/home/$agent_user"
printf '%s ALL=(root) NOPASSWD:ALL\n' "$agent_user" > "/etc/sudoers.d/$agent_user"
chmod 0440 "/etc/sudoers.d/$agent_user"
```

- [ ] **Step 3: 構文確認**

Run: `python3 -c "import json;json.load(open('.devcontainer/images/features/agent-user/devcontainer-feature.json'));print('ok')"`
Run: `sh -n .devcontainer/images/features/agent-user/install.sh && echo ok`
Expected: 両方 `ok`。（shellcheck があれば `shellcheck` も実行）

- [ ] **Step 4: 実行権限付与とコミット**

```bash
chmod +x .devcontainer/images/features/agent-user/install.sh
git add .devcontainer/images/features/agent-user/
git commit -m "feat: add agent-user devcontainer feature (#335)"
```

---

## Task 4: scripts を作成

**Files:**
- Create: `.devcontainer/scripts/check-gh-config-permissions.sh`
- Create: `.devcontainer/scripts/prepare-agent-workspace.sh`
- Create: `.devcontainer/scripts/install-agent-cli.sh`
- Create: `.devcontainer/scripts/configure-agent-runtime.sh`

- [ ] **Step 1: check-gh-config-permissions.sh を作成**

`.devcontainer/scripts/check-gh-config-permissions.sh`:
```bash
#!/usr/bin/env bash
# Verify that the host gh CLI config directory and credentials file have
# restrictive file modes before the devcontainer starts. Running this on
# the host avoids false positives from macOS/Podman bind mounts that can
# appear as mode 777 inside Linux containers.
set -euo pipefail

GH_DIR="${1:-${HOME}/.config/gh}"
HOSTS_FILE="${GH_DIR}/hosts.yml"
FAILED=0

mode_of() {
  local path="$1"

  if stat -f '%Lp' "${path}" >/dev/null 2>&1; then
    stat -f '%Lp' "${path}"
    return 0
  fi

  stat -c '%a' "${path}"
}

display_path() {
  local path="$1"
  local home_prefix="${HOME%/}/"

  if [[ "${path}" == "${HOME}" ]]; then
    printf '~'
  elif [[ "${path}" == "${home_prefix}"* ]]; then
    printf '~/%s' "${path#"${home_prefix}"}"
  else
    printf '%s' "${path}"
  fi
}

if [ ! -d "${GH_DIR}" ]; then
  echo "INFO: ${GH_DIR} not found; gh CLI auth not yet configured." >&2
  exit 0
fi

DIR_MODE=$(mode_of "${GH_DIR}")
if [ "${DIR_MODE}" != "700" ]; then
  echo "ERROR: ${GH_DIR} has mode ${DIR_MODE}, expected 700." >&2
  echo "  Fix on host: chmod 700 $(display_path "${GH_DIR}")" >&2
  FAILED=1
fi

if [ -f "${HOSTS_FILE}" ]; then
  FILE_MODE=$(mode_of "${HOSTS_FILE}")
  if [ "${FILE_MODE}" != "600" ]; then
    echo "ERROR: ${HOSTS_FILE} has mode ${FILE_MODE}, expected 600." >&2
    echo "  Fix on host: chmod 600 $(display_path "${HOSTS_FILE}")" >&2
    FAILED=1
  fi
fi

if [ "${FAILED}" -ne 0 ]; then
  echo "ERROR: Insecure file modes on gh config; fix on the host then restart the container." >&2
  exit 1
fi

echo "OK: gh config file modes are restrictive." >&2
```

- [ ] **Step 2: prepare-agent-workspace.sh を作成**

`.devcontainer/scripts/prepare-agent-workspace.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 claude|codex" >&2
  exit 64
fi

agent="$1"
case "$agent" in
  claude | codex)
    ;;
  *)
    echo "unsupported agent: $agent" >&2
    exit 64
    ;;
esac

if ! id "$agent" >/dev/null 2>&1; then
  echo "missing required user: $agent" >&2
  exit 69
fi

if [[ "$(id -un)" != "$agent" ]]; then
  echo "expected to run as $agent, got $(id -un)" >&2
  exit 77
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "expected $agent to use uid 0 for rootless Podman workspace writes" >&2
  exit 77
fi

write_check="$PWD/.devcontainer-write-check.$$"
touch "$write_check"
rm -f "$write_check"
```

- [ ] **Step 3: install-agent-cli.sh を作成**

`.devcontainer/scripts/install-agent-cli.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 claude|codex" >&2
  exit 64
fi

case "$1" in
  claude)
    package="claude-cli"
    binary="claude"
    ;;
  codex)
    package="codex-cli"
    binary="codex"
    ;;
  *)
    echo "unsupported agent: $1" >&2
    exit 64
    ;;
esac

if [[ "$(id -u)" -eq 0 ]]; then
  sudo_command=()
else
  sudo_command=(sudo)
fi

out_path="$(nix build --no-link --print-out-paths ".#${package}")"
"${sudo_command[@]}" ln -sf "${out_path}/bin/${binary}" "/usr/local/bin/${binary}"
"/usr/local/bin/${binary}" --version
```

- [ ] **Step 4: configure-agent-runtime.sh を作成（profile.d 名を本リポジトリ用に改名）**

`.devcontainer/scripts/configure-agent-runtime.sh`（リファレンスの `claude-md-*` profile.d を `command-ghostwriter-*` へ改名した版）:
```bash
#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
config_dir="${script_dir}/../config"

if [[ $# -ne 1 ]]; then
  echo "usage: $0 claude|codex" >&2
  exit 64
fi

agent="$1"
case "$agent" in
  claude | codex)
    ;;
  *)
    echo "unsupported agent: $agent" >&2
    exit 64
    ;;
esac

if ! id "$agent" >/dev/null 2>&1; then
  echo "missing required user: $agent" >&2
  exit 69
fi

if [[ "$(id -u)" -eq 0 ]]; then
  sudo_command=()
else
  sudo_command=(sudo)
fi

install_nix_binary() {
  local package="$1"
  local binary="$2"
  local out_path

  out_path="$(nix build --no-link --print-out-paths ".#${package}")"
  "${sudo_command[@]}" ln -sf "${out_path}/bin/${binary}" "/usr/local/bin/${binary}"
  "/usr/local/bin/${binary}" --version
}

install_nix_binary gh-cli gh
install_nix_binary pinned-uv uv
install_nix_binary python-runtime python3
if [[ ! -x "/usr/local/bin/apm" ]]; then
  install_nix_binary apm-cli apm
else
  echo "apm already present: $(/usr/local/bin/apm --version)"
fi
if [[ "$agent" == "codex" ]]; then
  install_nix_binary bubblewrap bwrap
fi

home_dir="$(getent passwd "$agent" | cut -d: -f6)"
if [[ -z "$home_dir" ]]; then
  echo "unable to resolve home for $agent" >&2
  exit 69
fi

"${sudo_command[@]}" mkdir -p "$home_dir/.config/gh"

case "$agent" in
  claude)
    "${sudo_command[@]}" mkdir -p "$home_dir/.claude"
    "${sudo_command[@]}" cp "${config_dir}/claude/settings.json" "$home_dir/.claude/settings.json"
    ;;
  codex)
    "${sudo_command[@]}" mkdir -p "$home_dir/.codex"
    "${sudo_command[@]}" cp "${config_dir}/codex/config.toml" "$home_dir/.codex/config.toml"
    ;;
esac

"${sudo_command[@]}" chown -R "$agent:$agent" "$home_dir/.config" "$home_dir/.$agent"

"${sudo_command[@]}" cp "${config_dir}/profile.d/command-ghostwriter-nix-path.sh" /etc/profile.d/command-ghostwriter-nix-path.sh
"${sudo_command[@]}" cp "${config_dir}/profile.d/command-ghostwriter-agent-prompt.sh" /etc/profile.d/command-ghostwriter-agent-prompt.sh

echo "configured devcontainer runtime for $agent"
```

- [ ] **Step 5: 構文確認**

Run: `for f in .devcontainer/scripts/*.sh; do bash -n "$f" && echo "ok $f"; done`
Expected: 全 `ok`。（shellcheck があれば併用）

- [ ] **Step 6: 実行権限付与とコミット**

```bash
chmod +x .devcontainer/scripts/*.sh
git add .devcontainer/scripts/
git commit -m "feat: add devcontainer setup scripts (#335)"
```

---

## Task 5: config / profile.d を作成

**Files:**
- Create: `.devcontainer/config/claude/settings.json`
- Create: `.devcontainer/config/codex/config.toml`
- Create: `.devcontainer/config/profile.d/command-ghostwriter-nix-path.sh`
- Create: `.devcontainer/config/profile.d/command-ghostwriter-agent-prompt.sh`

- [ ] **Step 1: Claude settings.json を作成**

`.devcontainer/config/claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "mcp__github__*"
    ]
  }
}
```

- [ ] **Step 2: Codex config.toml を作成（workspace パスを本リポジトリ用に）**

`.devcontainer/config/codex/config.toml`:
```toml
# Devcontainer-local defaults. This file lives on a container-engine
# named volume and is not read by the host.
approval_policy = "never"

[projects."/workspaces/command-ghostwriter"]
trust_level = "trusted"
```

- [ ] **Step 3: profile.d nix-path を作成（リファレンス verbatim）**

`.devcontainer/config/profile.d/command-ghostwriter-nix-path.sh`:
```sh
# Make binaries linked from Nix-built packages available in plain terminals.
case ":${PATH}:" in
  *:/usr/local/bin:*) ;;
  *) export PATH="/usr/local/bin:${PATH}" ;;
esac
```

- [ ] **Step 4: profile.d agent-prompt を作成（関数名のみ改名）**

`.devcontainer/config/profile.d/command-ghostwriter-agent-prompt.sh`（リファレンスの関数 `__claude_md_*` を `__cgw_*` へ改名、挙動は同一）:
```sh
# Short, devcontainer-local prompt: agent:repo(branch)$
__cgw_git_branch() {
  git symbolic-ref --quiet --short HEAD 2>/dev/null || git rev-parse --short HEAD 2>/dev/null
}

__cgw_agent_prompt() {
  local agent="${AGENT_CONTAINER:-agent}"
  local dir="${PWD##*/}"
  local branch
  branch="$(__cgw_git_branch)"
  if [ -n "$branch" ]; then
    printf '%s:%s(%s)\$ ' "$agent" "$dir" "$branch"
  else
    printf '%s:%s\$ ' "$agent" "$dir"
  fi
}

case "$-" in
  *i*) PS1='$(__cgw_agent_prompt)' ;;
esac
```

- [ ] **Step 5: 構文確認**

Run: `python3 -c "import json;json.load(open('.devcontainer/config/claude/settings.json'));print('ok')"`
Run: `python3 -c "import tomllib;tomllib.load(open('.devcontainer/config/codex/config.toml','rb'));print('ok')"`
Run: `for f in .devcontainer/config/profile.d/*.sh; do sh -n "$f" && echo "ok $f"; done`
Expected: 全 `ok`。

- [ ] **Step 6: コミット**

```bash
git add .devcontainer/config/
git commit -m "feat: add devcontainer agent config and profile.d (#335)"
```

---

## Task 6: 各エージェントの devcontainer.json を作成

**Files:**
- Create: `.devcontainer/claude/devcontainer.json`
- Create: `.devcontainer/codex/devcontainer.json`

- [ ] **Step 1: Claude devcontainer.json を作成**

`.devcontainer/claude/devcontainer.json`:
```json
{
  "name": "command-ghostwriter Claude",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "features": {
    "ghcr.io/devcontainers/features/nix:1": {
      "extraNixConfig": "experimental-features = nix-command flakes\naccept-flake-config = true"
    },
    "../images/features/agent-user": {
      "agentUser": "claude"
    }
  },
  "overrideFeatureInstallOrder": [
    "ghcr.io/devcontainers/features/nix",
    "../images/features/agent-user"
  ],
  "initializeCommand": "bash .devcontainer/scripts/check-gh-config-permissions.sh ${HOME}/.config/gh",
  "remoteUser": "claude",
  "updateRemoteUserUID": false,
  "mounts": [
    "source=command-ghostwriter-claude-session,target=/home/claude/.claude,type=volume",
    "source=${localEnv:HOME}/.config/gh,target=/home/claude/.config/gh,type=bind,consistency=cached"
  ],
  "remoteEnv": {
    "AGENT_CONTAINER": "claude"
  },
  "forwardPorts": [8502],
  "portsAttributes": {
    "8502": {
      "label": "Streamlit",
      "onAutoForward": "silent"
    }
  },
  "postCreateCommand": "bash .devcontainer/scripts/prepare-agent-workspace.sh claude && nix develop .#claude --command uv sync --locked --group local && bash .devcontainer/scripts/install-agent-cli.sh claude && bash .devcontainer/scripts/configure-agent-runtime.sh claude",
  "customizations": {
    "vscode": {
      "extensions": [
        "jnoortheen.nix-ide",
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-python.mypy-type-checker",
        "charliermarsh.ruff",
        "MS-CEINTL.vscode-language-pack-ja"
      ]
    }
  }
}
```

備考: リファレンスにあった ghcr `image:` pull と `ensure-agent-image.sh` は build-on-open のため不採用。egress の `postStartCommand` は #336 で追加するため本PRでは付けない。Streamlit はポート 8502 をフォワードするのみ（自動起動しない）。

- [ ] **Step 2: Codex devcontainer.json を作成**

`.devcontainer/codex/devcontainer.json`（Claude 版との差分: name/agentUser/remoteUser/mount/`runArgs` に seccomp 緩和）:
```json
{
  "name": "command-ghostwriter Codex",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "features": {
    "ghcr.io/devcontainers/features/nix:1": {
      "extraNixConfig": "experimental-features = nix-command flakes\naccept-flake-config = true"
    },
    "../images/features/agent-user": {
      "agentUser": "codex"
    }
  },
  "overrideFeatureInstallOrder": [
    "ghcr.io/devcontainers/features/nix",
    "../images/features/agent-user"
  ],
  "initializeCommand": "bash .devcontainer/scripts/check-gh-config-permissions.sh ${HOME}/.config/gh",
  "remoteUser": "codex",
  "updateRemoteUserUID": false,
  "runArgs": [
    "--security-opt=seccomp=unconfined"
  ],
  "mounts": [
    "source=command-ghostwriter-codex-session,target=/home/codex/.codex,type=volume",
    "source=${localEnv:HOME}/.config/gh,target=/home/codex/.config/gh,type=bind,consistency=cached"
  ],
  "remoteEnv": {
    "AGENT_CONTAINER": "codex"
  },
  "forwardPorts": [8502],
  "portsAttributes": {
    "8502": {
      "label": "Streamlit",
      "onAutoForward": "silent"
    }
  },
  "postCreateCommand": "bash .devcontainer/scripts/prepare-agent-workspace.sh codex && nix develop .#codex --command uv sync --locked --group local && bash .devcontainer/scripts/install-agent-cli.sh codex && bash .devcontainer/scripts/configure-agent-runtime.sh codex",
  "customizations": {
    "vscode": {
      "extensions": [
        "jnoortheen.nix-ide",
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-python.mypy-type-checker",
        "charliermarsh.ruff",
        "MS-CEINTL.vscode-language-pack-ja"
      ]
    }
  }
}
```

備考: リファレンス Codex は `--cap-add=NET_ADMIN` も付くが、これは egress(#336) 用のため本PRでは付けない（seccomp 緩和は codex sandbox 動作に必要なため残す）。

- [ ] **Step 3: JSON 構文確認**

Run: `for f in .devcontainer/claude/devcontainer.json .devcontainer/codex/devcontainer.json; do python3 -c "import json;json.load(open('$f'));print('ok $f')"; done`
Expected: 両方 `ok`。

- [ ] **Step 4: コミット**

```bash
git add .devcontainer/claude/devcontainer.json .devcontainer/codex/devcontainer.json
git commit -m "feat: add Claude and Codex build-on-open devcontainers (#335)"
```

---

## Task 7: 旧 devcontainer 構成を削除

**Files:**
- Delete: `.devcontainer/Dockerfile`
- Delete: `.devcontainer/devcontainer.json`

- [ ] **Step 1: 旧ファイルを削除**

```bash
git rm .devcontainer/Dockerfile .devcontainer/devcontainer.json
```

- [ ] **Step 2: 旧構成への参照が残っていないか確認**

Run: `git grep -n -i "devcontainer/Dockerfile" -- ':!docs/superpowers/'`
Expected: 出力なし（あれば該当ドキュメントを更新）。

- [ ] **Step 3: コミット**

```bash
git commit -m "chore: remove legacy single devcontainer config (#335)"
```

---

## Task 8: README に devcontainer 利用手順を追記

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 開発コンテナ節を追記**

README に「Dev Containers」節を追加し、VS Code で `.devcontainer/claude` または `.devcontainer/codex` を選んで起動する旨、初回は nix によるビルドで時間がかかる旨、Streamlit は `uv run streamlit run app.py` で手動起動する旨を記載。

- [ ] **Step 2: コミット**

```bash
git add README.md
git commit -m "docs: document agent devcontainer usage (#335)"
```

---

## Task 9: 静的検証の総点検とプッシュ

**Files:** なし

- [ ] **Step 1: 全 JSON/TOML/シェルの静的検証**

```bash
for f in $(git ls-files '.devcontainer/**/*.json'); do python3 -c "import json;json.load(open('$f'))"; done && echo json-ok
for f in $(git ls-files '.devcontainer/**/*.sh'); do bash -n "$f" || sh -n "$f"; done && echo sh-ok
python3 -c "import tomllib;tomllib.load(open('.devcontainer/config/codex/config.toml','rb'));print('toml-ok')"
```
Expected: `json-ok` / `sh-ok` / `toml-ok`。

- [ ] **Step 2: 検証限界の明示**

報告に「flake.nix 実ビルド・flake.lock 生成・コンテナ実起動は本環境（nix未導入）で未検証。Task 2 と実起動確認は nix 対応ホストで要実施」と明記する（`verification-before-completion` スキル）。

- [ ] **Step 3: プッシュ**

```bash
git push -u origin claude/adoring-fermat-pMNKe
```
ネットワークエラー時のみ 2s/4s/8s/16s で最大4回リトライ。

---

## nix ホストでの受け入れ確認（PR レビュー前提・参考）

実 devcontainer 環境で以下を確認する（本環境では不可）:
1. `nix flake lock` 済みで `nix develop .#claude --command true` が成功。
2. VS Code で `.devcontainer/claude` を Reopen in Container → postCreate 完走（`uv sync --locked --group local`、`claude --version`、`apm --version`）。
3. `.devcontainer/codex` も同様（`codex --version`、bubblewrap 導入）。
4. `uv run streamlit run app.py` でアプリ起動、ポート 8502 フォワード。
