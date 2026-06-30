# ローカル workflow lint ゲートとリリースアーカイブ事前検証 設計書

**関連:** Issue #393（レトロ #392 のアクション、親: #390 / PR #391）
**参照:** `tvna/claude-md`（`.pre-commit-config.yaml` の actionlint エントリ、
`scripts/install-actionlint.sh`、`scripts/_session_path.sh`、`scripts/flake_pin.py`）

---

## 1. 背景と問題

レトロ #392 は、PR #391 の 2 修復がいずれも **missing-deterministic-gate**
（ローカルに決定的ゲートが無かった）であり、共通根因が web 開発環境のギャップで
あることを特定した。

1. **SC2086 を CI で初検知**: web 環境には actionlint も shellcheck も無く、
   既存の `actionlint-system` pre-commit フック（`.pre-commit-config.yaml`）は
   ローカルで実行できなかった。push 前に lint を再現する手段が存在しない。
   なお actionlint は shellcheck バイナリが PATH に無いと shellcheck ルール
   （SC2086 含む）を**黙ってスキップ**するため、actionlint 単体の導入では
   再発防止にならない。shellcheck の明示的な導入が必須。
2. **apm アーカイブの入れ子で exit 127**: リリース配布物の展開ロジックを、
   実アーカイブの構造を確認せずに書いた。`tar -tzf` の事前確認があれば
   CI 前に捕捉できた。

付随する既存の不整合: CI の "Guard workflow files"
（`reusable-test-and-build.yml`）は `download-actionlint.bash` で
**actionlint 最新版を都度取得**（バージョン未ピン・チェックサム検証なし）、
shellcheck は ubuntu-latest 同梱版に暗黙依存している。ローカルと CI の判定
バージョンがずれうるうえ、未検証の最新バイナリ取得は供給網的にも弱い。

## 2. 目標と非目標

**目標:**

1. `.github/workflows/**` を push する前に、web 環境を含むローカルで
   actionlint（shellcheck 同梱判定）を実行可能にする。バージョンと SHA256 は
   `flake.nix` を単一情報源（SSOT）としてピン留めし、devcontainer / web /
   CI の三者が同一ピンで判定する。
2. リリース配布物の展開ロジックを書く前に、アーカイブ構造を決定的に
   事前検証する軽量スクリプトと運用ルールを用意する。

**非目標:**

- pre-commit フックのソフトスキップ化はしない（オーナー判断: ハードのまま。
  素のローカル環境でのフックエラーは「インストールせよ」のシグナルとする）。
- `verify-superpowers.yml` の APM ピン（env 直書き + flake.nix 参照コメント）の
  `flake_pin.py` への移行は今回のスコープ外（変更面を #393 の範囲に限定）。
- claude-md の `flake_pin.py` の bump / asset-url 系サブコマンドの移植はしない
  （YAGNI。必要になった時点で追加）。

## 3. 設計判断の根拠（オーナー承認済み）

- **ピン SSOT = flake.nix**: 既に apm/claude/codex/uv を fetchurl でピン留め
  している場所であり、devcontainer 供給と web インストーラ・CI の参照を一点に
  集約できる。claude-md の確立済みパターン（`actionlintVersion` +
  `actionlintNative.<system>`）を踏襲する。
- **pre-commit フックはハード維持**: web 環境は SessionStart インストーラが
  存在を保証するため、ソフトスキップによる「黙って素通し」の余地を作らない。
- **アイテム 2 は検査スクリプト + 運用ルール**: ネットワーク依存の pytest は
  重い。再現可能な決定的チェック（スクリプト）と CLAUDE.local.md の運用ルールの
  組み合わせが「軽く用意する」の要求に合致する。
- **CI もピン留めに揃える**: ローカル・devcontainer・CI の判定バージョン一致と
  SHA256 検証（供給網保護）の両方を得る。

**ピン対象バージョン**（設計時点の最新安定版、実装時に SHA256 を確定）:

| ツール | バージョン | アセット（x86_64 / aarch64） | アーカイブ構造 |
|---|---|---|---|
| actionlint | v1.7.12 | `actionlint_1.7.12_linux_amd64.tar.gz` / `..._arm64.tar.gz` | 素の `actionlint` バイナリ（囲いディレクトリ無し） |
| shellcheck | v0.11.0 | `shellcheck-v0.11.0.linux.x86_64.tar.xz` / `...aarch64.tar.xz` | `shellcheck-v0.11.0/` に入れ子 |

アーカイブ構造の欄は**実装時に C3 の検査スクリプトで実物を確認してから**
展開ロジックに反映する（#392 アクション 1 の自己適用）。SHA256 は upstream の
checksums ファイルと、ダウンロード実物からの再計算の両方で確定する。

## 4. アーキテクチャ（コンポーネント）

### C1. `flake.nix` — actionlint / shellcheck ピン追加（SSOT）

既存 `apm-cli` と同型の fetchurl 派生を追加する。

- `actionlintVersion` + `actionlintNative.<system>.{asset, hash}` →
  `actionlint-cli` 派生（`install -Dm755 actionlint $out/bin/actionlint`）
- `shellcheckVersion` + `shellcheckNative.<system>.{asset, hash}` →
  `shellcheck-cli` 派生（入れ子ディレクトリから `shellcheck` を取り出す）
- 両派生を `sharedPackages` に追加 → devcontainer は nix 経由で自動供給

### C2. `scripts/flake_pin.py`（新規・stdlib のみ・最小移植）

claude-md の同名モジュールから **`resolve` サブコマンドのみ**を移植する。

```
python3 scripts/flake_pin.py resolve --tool actionlint --system x86_64-linux
# -> 3 行: version / asset ファイル名 / sha256-hex（SRI base64 を hex に変換）
```

- 対応ツール: `actionlint`, `shellcheck`（`<tool>Version` +
  `<tool>Native.<system>.{asset, hash}` を正規表現で読む）
- fail-loud: flake.nix 欠落・フィールド不明・非 SRI ハッシュは非ゼロ exit
  （黙って推測しない）

### C3. `scripts/inspect_release_archive.sh`（新規・#392 アクション 2）

```
inspect_release_archive.sh <url-or-path> [--sha256 <hex>] [--expect-path <member>]
```

- URL なら tmpdir にダウンロード（ローカルパスも受け付ける）
- `--sha256` 指定時は `sha256sum -c` で検証（不一致は非ゼロ exit）
- 拡張子（`.tar.gz` / `.tgz` / `.tar.xz` / `.zip`）に応じて内容一覧を表示:
  トップレベル構造の要約 + 先頭 ~40 エントリ
- `--expect-path` 指定時は該当メンバーの存在を表明（不在なら非ゼロ exit）
- 用途: 展開ロジックを書く**前**に `--strip-components` の要否等を観測で確定する

**運用ルール（CLAUDE.local.md に追記）**: リリース配布物（tar.gz 等）の
展開ロジックを書く前に本スクリプトでピン留めアーカイブの実構造を確認し、
観測したレイアウトをコードとコメントに反映する。

### C4. web 環境インストーラ + SessionStart フック

**`scripts/_session_path.sh`**（新規）: claude-md の `persist_session_path()`
をそのまま移植。`$CLAUDE_ENV_FILE` への `export PATH=...` 追記 + 現プロセスへの
export。空ディレクトリは fail-loud で拒否。

**`scripts/install-workflow-linters.sh`**（新規）: claude-md の
`install-actionlint.sh` を踏襲し、actionlint と shellcheck の **2 バイナリ**を
導入する。

1. `CLAUDE_CODE_REMOTE=true`（または `CODEX_CODE_REMOTE=true`）以外は
   silent no-op（devcontainer は nix が供給するため）
2. `uname -m` を nix system にマップ（x86_64 / aarch64。他は警告してスキップ）
3. ツールごとに: `flake_pin.py resolve` でピン解決 → 既に PATH 上に
   ピン一致バージョンがあれば再利用（冪等）→ ダウンロード →
   `sha256sum -c` → tmpdir 展開 → `~/.local/bin` へ mktemp + `mv -f` で
   アトミック設置
4. `persist_session_path "${HOME}/.local/bin"`
5. 片方の失敗は fail-loud（メッセージを stderr に出して非ゼロ exit。
   SessionStart フックのエラーはセッションをブロックしないが、警告として可視化される）

**`.claude/settings.json`**: SessionStart に
`bash scripts/install-workflow-linters.sh` を追記
（matcher: `startup|resume|clear|compact`、`async: false`。
2 回目以降は冪等チェックで即 return するため起動コストは初回のみ）。

### C5. CI "Guard workflow files" のピン留め（`reusable-test-and-build.yml`）

`Download and run actionlint` ステップを置換する:

1. `python3 scripts/flake_pin.py resolve` で actionlint / shellcheck の
   ピンを解決（checkout 済みのため追加セットアップ不要）
2. それぞれ curl → `sha256sum -c` → `${RUNNER_TEMP}/lint-bin` に展開・設置
3. `${RUNNER_TEMP}/lint-bin` を PATH 先頭に置いて `actionlint -color` を実行
   （ubuntu-latest 同梱 shellcheck への暗黙依存を断ち、ピン版で判定）

### C6. テスト（`tests/unit/`、ネットワーク非依存）

- `test_flake_pin.py`: resolve 正常系（フィクスチャ flake.nix）、SRI→hex 変換、
  ツール名不正・system 不正・flake 欠落・非 SRI ハッシュの fail-loud
- `test_inspect_release_archive.py`: tmp_path に生成した tar.gz / tar.xz
  フィクスチャ（入れ子あり / なし）に対し、構造表示・`--sha256` 成否・
  `--expect-path` 成否・未対応拡張子の fail-loud を検証
  （ローカルパス入力を使いネットワーク不要）

## 5. 検証計画と限界

| 対象 | 検証方法 |
|---|---|
| C2 / C3 | pytest（unit マーカー、pre-commit の `pytest_without_e2e` でも実行される） |
| C4 インストーラ | 本作業環境が `CLAUDE_CODE_REMOTE=true` のため**実走で検証可能**: 実行後に `actionlint --version` / `shellcheck --version` がピンと一致すること、既存 workflow 一式が actionlint を通ることを確認 |
| C5 CI 変更 | 実走は CI ランナー上のみ。push 前に新しいローカル actionlint ゲートで当該 YAML 自身を lint する（自己適用）。yamllint / check-github-workflows / prettier の既存 pre-commit ゲートも通す |
| C1 nix 派生 | 本環境に nix は無いため `nix build` の実走は不可。構文・ハッシュ値の静的検証に留める（限界として明記）。devcontainer での実ビルドは後続の通常利用で確認される |

## 6. 新規／変更成果物

- 新規: `scripts/flake_pin.py`
- 新規: `scripts/install-workflow-linters.sh`
- 新規: `scripts/_session_path.sh`
- 新規: `scripts/inspect_release_archive.sh`
- 新規: `tests/unit/test_flake_pin.py`
- 新規: `tests/unit/test_inspect_release_archive.py`
- 変更: `flake.nix`（actionlint / shellcheck ピン + sharedPackages）
- 変更: `.claude/settings.json`（SessionStart フック追記）
- 変更: `.github/workflows/reusable-test-and-build.yml`（guard ジョブのピン留め）
- 変更: `CLAUDE.local.md`（アーカイブ事前検証の運用ルール追記）

## 7. コミット規約

各コミット末尾に `(#393)`。
