# IKEv2 VPNルーター マルチベンダー相互接続テンプレート 10件 追加 設計書

Refs #595

## 1. 目的

`network`カテゴリに、IKEv2サイト間IPsec VPNをベンダー実機CLIで構成する手順書テンプレートを10本追加する。全10本は同一のIKEv2/IPsec暗号プロファイルを採用し、どの2ベンダーの組み合わせでもVPNピアとして相互接続できることを、各テンプレート単体の記述から読み取れるようにする。

## 2. スコープ

### 2.1 ベンダー構成と件数(10ベンダー・10件)

| # | ベンダー | 市場 | id | subCategory | 備考 |
|---|---|---|---|---|---|
| 1 | Cisco (IOS-XE, IKEv2 VTI) | 米国 | `cisco-ikev2-vpn` | `Cisco`(既存流用) | `crypto ikev2` 系 |
| 2 | Juniper Networks (SRX/JunOS) | 米国 | `juniper-ikev2-vpn` | `Juniper`(新規) | `set security ike` 系 |
| 3 | Palo Alto Networks (PAN-OS) | 米国 | `paloalto-ikev2-vpn` | `Palo Alto Networks`(新規) | `set network ike` 系 |
| 4 | SonicWall (SonicOS) | 米国 | `sonicwall-ikev2-vpn` | `SonicWall`(新規) | `vpn-policy` 系。一次情報要確認 |
| 5 | Ubiquiti EdgeRouter (EdgeOS) | 米国 | `edgerouter-ikev2-vpn` | `Ubiquiti`(新規) | `set vpn ipsec` 系(Vyatta系) |
| 6 | Aruba (HPE) ブランチゲートウェイ (ArubaOS) | 米国 | `aruba-ikev2-vpn` | `Aruba`(新規) | `crypto-local` 系。一次情報要確認 |
| 7 | Fortinet (FortiOS) | 日本(高シェア)/global | `fortinet-ikev2-vpn` | `Fortinet`(新規) | `config vpn ipsec phase1/2-interface` |
| 8 | YAMAHA (RTX) | 日本 | `yamaha-ikev2-vpn` | `YAMAHA`(既存流用) | `ipsec ike` 系。既存`yamaha-ipsec-vpn`とは別ファイル |
| 9 | NEC (IXシリーズ) | 日本 | `nec-ikev2-vpn` | `NEC`(新規) | `crypto isakmp` 系(Cisco類似)。一次情報要確認 |
| 10 | Allied Telesis (AlliedWare Plus) | 日本/global | `alliedtelesis-ikev2-vpn` | `Allied Telesis`(新規) | `crypto isakmp` 系(IOS類似)。一次情報要確認 |

各テンプレートは `assets/examples/<id>.toml` + `assets/examples/<id>.j2` のペア。`format: "toml"`, `output: "markdown"`, `category: "network"`。

### 2.2 新規サブカテゴリ(`ALLOWED_SUBCATEGORIES["network"]` へ追加)

`Juniper`, `Palo Alto Networks`, `SonicWall`, `Ubiquiti`, `Aruba`, `Fortinet`, `NEC`, `Allied Telesis` の8件。`Cisco`/`YAMAHA`は既存のため追加不要。追加前に既存の全許可リストを確認し、近縁語の重複がないことを確認する。

## 3. 共通IKEv2相互接続プロファイル

全10テンプレートの「シナリオ設定」節に、以下を同一文言で明記する(値・文言を完全に揃えることが相互接続性の担保そのものであり、これが崩れると設計の前提が崩れる):

- IKEv2のみを使用(IKEv1は使わない)
- IKE(Phase1): 暗号 AES-256(CBC)、ハッシュ/PRF SHA-256、DHグループ Group 14(2048-bit MODP)
- IPsec(Phase2/ESP): 暗号 AES-256、認証 SHA-256、PFS Group 14で有効
- 認証方式: 事前共有鍵(PSK)
- IKE SAライフタイム 28800秒(8時間)、IPsec SAライフタイム 3600秒(1時間)
- NAT-T: 自動検出で有効、DPD(Dead Peer Detection): 有効

暗号スイート自体はテンプレート変数化せず、各ベンダーの実CLI構文として直接記述する(パラメータ化すると相互接続性を崩す設定を投入できてしまうため)。変数化するのは拠点固有値のみ: `local_wan_ip`, `remote_wan_ip`, `local_lan`, `remote_lan`, `pre_shared_key_note`(既存`yamaha-ipsec-vpn`の変数命名を踏襲)。

## 4. 命名・内容規約

- 6セクション構成(目的/用語解説/シナリオ設定/手順/動作確認/注意事項)を既存テンプレート(`yamaha-ipsec-vpn.j2`等)と同様に踏襲する。
- 手順内のCLIコードブロックは、そのベンダーの実在するコマンド構文をそのまま記載する。プレースホルダーの疑似コマンドは書かない。
- 事前共有鍵は値をテンプレートに書かず、`********`のようなマスク表記 + 平文保存を避ける旨の注記(既存`yamaha-ipsec-vpn`踏襲)。
- 「用語解説」または「シナリオ設定」に、本テンプレート群が共通プロファイルを用いており他ベンダーとの相互接続を想定している旨を一文で明記する。
- Jinja制限: `{% macro %}` `{% include %}` `{% import %}` `{% extends %}` `{% do %}` タグ禁止。制限属性名(`request`, `config`, `os`, `sys`, `builtins`, `eval`, `exec`, `getattr`, `setattr`, `delattr`, `globals`, `locals`, `__class__`, `__base__`, `__subclasses__`, `__mro__`)を変数名・属性名・サブスクリプトキーとして使わない。
- credential-shaped文字列(`user:pass`等)をコマンド中に書かない。

## 5. 一次情報での検証(ベンダー構文の裏取り)

Aruba・NEC・Allied Telesis・SonicWallの4ベンダーは実機CLI構文の記憶があいまいなリスクがあるため、生成時にベンダー公式ドキュメントをWebSearch/WebFetchで確認してから記述する。Cisco/Juniper/Palo Alto/Fortinet/YAMAHA/Ubiquitiは広く文書化されているため確度は高いが、同様に一次情報で最終確認する。これは#583で報告された「もっともらしいが間違ったベンダー構文」というプラウジブル・バット・ロング型の失敗を防ぐための対策。

## 6. 実行アーキテクチャ

10件という規模(既存の100〜315件バッチより小さい)のため、#583のフルスケール5フェーズプロセスは簡略化して適用する。

- **Phase A(計画)**: 本設計書がそのまま計画の基礎。追加のJSON計画ファイルは不要(writing-plansスキルでタスク単位のチェックリストに展開)。
- **Phase B(生成)**: 1回の`Workflow`内、`pipeline()`で10件を並行処理(10件は`parallel()`の単一バッチで問題ない規模)。各エージェントは対象ベンダー1件を担当し、上記の共通プロファイル・命名規約・一次情報検証方針を守った上でテンプレートペアを作成し、`scripts/local_render_check.py`で自己検証する。`web/src/lib/templates.ts`・テストファイルには触れない。
- **Phase C(統合)**: `templates.ts`の`META`配列へ10行追記(マーカー文字列が1箇所にしか一致しないことを確認してから挿入)。`test_template_taxonomy.py`の`ALLOWED_SUBCATEGORIES["network"]`へ8件追加。
- **Phase D(検証)**: `uv run pytest`, `uv run ruff check .`, `uv run mypy .`, `web/`配下で`npx tsc -b`, `npx vitest run`。
- **Phase E(納品)**: 変更差分全体に対するレビュー(操作ロジック上の矛盾がないかの通しレビュー)+ Aruba/NEC/Allied Telesis/SonicWallのベンダー構文に絞ったスポットチェック。Issue #595を全コミット/PRで参照し、PRオープン後は自動監視してマージまで追従する。

## 7. リスクと既知の制約

- ベンダー実機構文の誤り(プラウジブル・バット・ロング): 5節の一次情報検証で軽減。
- 相互接続性の前提(暗号プロファイル完全一致)が10ファイルのどれか1つでも文言・値がずれると崩れる: Phase Eの通しレビューで10ファイル横断の整合性を確認する。
- SonicWall/Arubaは製品ラインによってCLI機能の可否・構文が異なる場合がある(GUIやAPI中心の操作が主で、CLIでのVPN設定自体がドキュメント上限定的な可能性がある)。生成時点で実在するCLI手順が確認できない場合は、その旨をスコープ外として報告し設計を見直す。

## 8. スコープ外

- 証明書認証・IKEv1・ダイナミックルーティング(BGP over VPN等)は対象外。PSKベースの静的サイト間VPNのみ。
- 既存`yamaha-ipsec-vpn`テンプレートの変更・統合は行わない。
- ベンダー間の実機による相互接続の実機検証(実機がないため、構文レベルでの整合性確認に限定)。
