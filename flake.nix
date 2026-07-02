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
          actionlintVersion = "1.7.12";
          # NOTE: asset filenames embed the version; flake_pin.py asserts that
          # consistency on every resolve, so a version bump that forgets the
          # asset line fails loud.
          actionlintNative = {
            aarch64-linux = { asset = "actionlint_1.7.12_linux_arm64.tar.gz"; hash = "sha256-Ml6XG2upv6UEZy4pvpPCSYHuscB1dtcw6ffIgFr/8MY="; };
            x86_64-linux = { asset = "actionlint_1.7.12_linux_amd64.tar.gz"; hash = "sha256-isqNuW8blHcPGw1ytt3cseu4EjyzcSUwsIzDh7NJo9g="; };
          }.${system};
          shellcheckVersion = "0.11.0";
          shellcheckNative = {
            aarch64-linux = { asset = "shellcheck-v0.11.0.linux.aarch64.tar.xz"; hash = "sha256-ErMxwdLba56xPPymQwaxsVeobraduDAj4mHqp+fBRYg="; };
            x86_64-linux = { asset = "shellcheck-v0.11.0.linux.x86_64.tar.xz"; hash = "sha256-jDvhKwXVwXegTCnjx4zomshvFZVoHKsUm2W5fE4icZg="; };
          }.${system};
          uvNative = {
            aarch64-linux = { target = "aarch64-unknown-linux-gnu"; hash = "sha256-miDWWxEHcLuqLuie1265Y9jGpIC56+9YTqnfKuhbTw8="; };
            x86_64-linux = { target = "x86_64-unknown-linux-gnu"; hash = "sha256-kgy8qtUUzBhWNPbw3Ncd9ej07kRW1ECiLg+MDxQqggM="; };
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
          actionlint-cli = pkgs.stdenvNoCC.mkDerivation {
            pname = "actionlint";
            version = actionlintVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/rhysd/actionlint/releases/download/v${actionlintVersion}/${actionlintNative.asset}";
              hash = actionlintNative.hash;
            };
            # The tarball is flat (no enclosing directory): the bare
            # `actionlint` binary sits at the top level next to docs/ and man/.
            # Verified with scripts/inspect_release_archive.sh (#392 action 1).
            sourceRoot = ".";
            dontBuild = true;
            dontStrip = true;
            dontPatchELF = true;
            installPhase = ''
              runHook preInstall
              install -Dm755 actionlint $out/bin/actionlint
              runHook postInstall
            '';
          };
          shellcheck-cli = pkgs.stdenvNoCC.mkDerivation {
            pname = "shellcheck-bin";
            version = shellcheckVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/koalaman/shellcheck/releases/download/v${shellcheckVersion}/${shellcheckNative.asset}";
              hash = shellcheckNative.hash;
            };
            # The archive nests everything under shellcheck-v<version>/, which
            # stdenv auto-detects as sourceRoot. Verified with
            # scripts/inspect_release_archive.sh (#392 action 1).
            dontBuild = true;
            dontStrip = true;
            dontPatchELF = true;
            installPhase = ''
              runHook preInstall
              install -Dm755 shellcheck $out/bin/shellcheck
              runHook postInstall
            '';
          };
        in
        {
          inherit claude-cli codex-cli pinned-uv apm-cli actionlint-cli shellcheck-cli;
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
            agentPackages.pinned-uv agentPackages.actionlint-cli agentPackages.shellcheck-cli
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
