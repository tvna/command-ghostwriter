# AIインフラテンプレート100本追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: このプランは通常の
> subagent-driven-development / executing-plans とは異なる実行体制を取る
> （オーナー指定: 計画用サブエージェントによる計画 + ダイナミック
> ワークフローによる並行実装）。Task 1はAgentツールを
> 単一メッセージで10並列実行し、Task 4はWorkflowツールを1回呼び出す。
> それ以外のタスクはこのセッションでインラインに実行する。
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `web/src/lib/templates.ts` の `ai` カテゴリに、新規100件のテンプレート
（`assets/examples/<id>.j2` + データファイルのペア）を追加する。

**Architecture:** (1) 10クラスタそれぞれについて計画用エージェントが12件程度
ブレインストーミングして上位10件を選定 → (2) 選定結果を集約・重複解消して単一
のマスタースペックにする → (3) タクソノミー許可リストを拡張 → (4) 実装用の
ダイナミックワークフローが100件を並行生成し、`scripts/local_render_check.py`
で自己検証・修復する → (5) `templates.ts` に単一編集でMETA追加 → (6) 全体検証
→ (7) クラスタ単位で分割コミットしてpush。

**Tech Stack:** Jinja2 (SandboxedEnvironment, strict undefined), TOML/YAML/CSV,
TypeScript (`templates.ts` のデータリテラル), pytest, `Workflow`/`Agent` ツール。

参照: `docs/superpowers/specs/2026-07-17-ai-infra-templates-100-design.md`
（Issue #576）

---

### Task 1: クラスタ別プランニング（計画用サブエージェント、10並列）

**Files:**
- Create: `docs/superpowers/specs/2026-07-17-cluster-<N>-<slug>.json`（N=1〜10、
  実行時に一時生成。マージ後は不要になるためコミット対象外）

- [ ] **Step 1: 既存idリストを再生成する**

Run:
```bash
grep -oP 'id: "\K[^"]+' web/src/lib/templates.ts | sort > /tmp/existing_ids.txt
wc -l /tmp/existing_ids.txt
```
Expected: `246 /tmp/existing_ids.txt`

- [ ] **Step 2: 10クラスタ分の`Agent`呼び出しを単一メッセージで並列実行する**

各クラスタについて、下記テンプレートの `{{...}}` を埋めて `Agent` ツールを
呼ぶ（`subagent_type: "general-purpose"`, 10件を1メッセージ
にまとめて並列発火する）。

プロンプトテンプレート:
```text
あなたはcommand-ghostwriterというツールのテンプレートライブラリを拡張する
計画担当です。command-ghostwriterはCLI運用手順を、設定定義ファイル
(toml/yaml/csv)とJinja2テンプレート(.j2)のペアからMarkdown手順書として生成
するツールです。

今回追加するのは「{{CLUSTER_NAME}}」クラスタに属するAIインフラ関連テンプレート
10件です。対象領域の例: {{TOPIC_EXAMPLES}}。

以下の制約を厳守し、12件程度の候補をブレインストーミングしたうえで、教育的
価値・実務との近さ・既存重複の少なさで評価し、最終的に重複のない10件に絞り
込んでください。

制約:
- id は kebab-case の英数字とハイフンのみ。次の既存246件のidと重複しては
  ならない: {{EXISTING_IDS_CSV}}
- category は "ai" 固定、subCategory は "{{SUBCATEGORY}}" 固定
- format は "toml"/"yaml"/"csv" のいずれか。単純な設定ならtoml、リスト状
  （一覧・複数行の対象を扱う）ならcsv、ネストした構成ならyaml、という既存の
  傾向を目安にバランスよく分散させる（10件中3〜4件ずつが目安）
- activity は省略(=build)を基本とし、内容が「障害切り分け・トラブル
  シューティング」なら "troubleshoot"、「インシデント対応」なら
  "security-response"、「定期棚卸し・定期点検」なら "routine"、「復旧訓練」
  なら "drill" を付与する。10件中2〜3件程度に留め、残りは省略する
- name は日本語15〜30文字程度、体言止め（既存例: "Hugging Faceモデルの
  ダウンロードとキャッシュ管理"）
- desc は日本語40〜70文字程度、「〜の手順書（Markdown）を生成。」また
  「〜手順書を生成。」で終える既存の文体に合わせる（既存例:
  "huggingface-cliによるモデル取得・キャッシュ配置・容量整理と、トークン
  管理を行う手順書を生成。"）
- 各件について、生成されるMarkdownが以下6セクション構成になるよう、
  「## 手順」の骨子（3〜6ステップの見出しを "; " 区切りの1文字列）を含める:
  タイトル+導入 / 目的 / 用語解説 / シナリオ設定または背景 / 手順 / 動作確認
  / 注意事項
- 実在するコマンド・ツール・オプションのみを使うこと（架空のCLIオプションを
  作らない）

出力形式: `docs/superpowers/specs/2026-07-17-cluster-{{N}}-{{SLUG}}.json` に
以下のJSON配列をWriteツールで書き込むこと。標準出力への説明や前置きは不要。
各要素のキー: id, name, desc, subCategory, format, activity(該当時のみ),
outline(手順骨子の1文字列)。
```

クラスタ表（`{{CLUSTER_NAME}}` / `{{SUBCATEGORY}}` / `{{TOPIC_EXAMPLES}}` /
`{{N}}` / `{{SLUG}}`）:

| N | SLUG | CLUSTER_NAME | SUBCATEGORY | TOPIC_EXAMPLES |
| --- | --- | --- | --- | --- |
| 1 | gpu-cluster | GPUクラスタ基盤 | GPUクラスタ | Slurm, InfiniBand/RoCE, NCCL, DCGM, k8s GPU operator, ノードドレイン, トポロジ考慮スケジューリング, 複数ノードNVLink, GPU故障切り分け, ラック電源設計 |
| 2 | model-conversion | モデル変換・量子化・配布 | モデル管理 | GGUF変換, ONNX変換, AWQ/GPTQ量子化, LoRAマージ, モデルレジストリ, safetensors変換, モデル署名検証, S3/MinIO配布, モデルカード管理, バージョニング |
| 3 | inference-engine | 推論エンジン運用 | 推論サーバ | Triton, TGI, SGLang, TensorRT-LLM, llama.cpp server, embeddingサーバ, Whisper音声認識サーバ, マルチモデルルーティング, カナリアデプロイ, A/Bテスト |
| 4 | vector-db | ベクトルDB/検索基盤 | ベクトルDB | Qdrant, Milvus, Weaviate, pgvector, Elasticsearch kNN, ハイブリッド検索, インデックス再構築, embeddingバッチ生成, チャンク分割パイプライン, 検索精度評価 |
| 5 | mlops | MLOps/実験管理 | MLOps | MLflow, DVC, W&B self-host, feature store, Airflowパイプライン, 分散学習ジョブ管理, チェックポイント管理, ハイパラ探索, データバージョニング, 学習再現性 |
| 6 | observability | LLMオブザーバビリティ/監視 | 監視・可観測性 | Langfuse, プロンプトロギング, トークン使用量ダッシュボード, GPUクラスタGrafana監視, レイテンシSLOアラート, コスト異常検知, トレース基盤, エラー率監視, キャパシティプランニング, 障害切り分け |
| 7 | security | AIセキュリティ/ガバナンス | セキュリティ・ガバナンス | プロンプトインジェクション対策, PIIレダクション, モデルアクセス制御, 監査ログ, APIキーローテーション, データ漏洩防止, レッドチーム演習, サプライチェーン検証, 利用ポリシー適用, インシデント対応 |
| 8 | agent-rag | エージェント/RAG応用基盤 | エージェント基盤 | RAGパイプライン, MCPサーバホスティング, エージェントオーケストレーション, ツール呼び出しゲートウェイ, プロンプトテンプレート管理, セッション永続化, function calling監視, ブラウザ自動化基盤, ワークフローオーケストレーション, semantic cache |
| 9 | cloud-ai | クラウドAIサービス | クラウドAI | AWS Bedrock, SageMaker, Azure OpenAI Service, GCP Vertex AI, クラウドGPUインスタンス管理, スポット活用, クラウド間モデル移行, マルチクラウドフェイルオーバー, コスト最適化, IAM/AI権限設計 |
| 10 | data-infra | データ基盤/前処理 | データ基盤 | トレーニングデータETL, 重複排除, データクレンジング, ラベリング基盤, データセットバージョン管理, PDFテキスト抽出, 画像前処理, マルチモーダルデータ管理, データ品質検証, 評価用データセット構築 |

`{{EXISTING_IDS_CSV}}` は Step 1 で生成した `/tmp/existing_ids.txt` をカンマ
区切りにしたもの。

- [ ] **Step 3: 10ファイルが揃ったことを確認する**

Run:
```bash
ls docs/superpowers/specs/2026-07-17-cluster-*.json | wc -l
python3 -c "
import json, glob
total = 0
for f in sorted(glob.glob('docs/superpowers/specs/2026-07-17-cluster-*.json')):
    data = json.load(open(f))
    assert len(data) == 10, f'{f}: expected 10 items, got {len(data)}'
    total += len(data)
print(f'OK: {total} items across {len(glob.glob(\"docs/superpowers/specs/2026-07-17-cluster-*.json\"))} files')
"
```
Expected: `10` then `OK: 100 items across 10 files`

---

### Task 2: マスタースペックの集約・重複解消

**Files:**
- Create: `docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.json`
  （実装フェーズの入力。コミット対象外の作業ファイル）
- Create: `docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.md`
  （100件の一覧表。監査証跡として2026-07-12設計の
  `infra-training-scenario-templates-scenario-details.md` に倣いコミットする）

- [ ] **Step 1: 10ファイルを1つのJSON配列にマージし、id衝突を検出する**

Run:
```bash
python3 -c "
import json, glob, sys

existing = set(open('/tmp/existing_ids.txt').read().split())
items = []
seen = set()
dupes = []
for f in sorted(glob.glob('docs/superpowers/specs/2026-07-17-cluster-*.json')):
    for item in json.load(open(f)):
        tid = item['id']
        if tid in existing or tid in seen:
            dupes.append((f, tid))
        seen.add(tid)
        items.append(item)

if dupes:
    print('DUPLICATE IDS FOUND:', dupes)
    sys.exit(1)

assert len(items) == 100, f'expected 100 items, got {len(items)}'
json.dump(items, open('docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.json', 'w'), ensure_ascii=False, indent=2)
print(f'merged {len(items)} items, no duplicates')
"
```
Expected: `merged 100 items, no duplicates`. If duplicates are found, rename the
offending `id` directly in its cluster JSON file (append a distinguishing
suffix, e.g. `-v2` or a more specific noun) and re-run this step.

- [ ] **Step 2: 監査用Markdown一覧を生成してコミットする**

Run:
```bash
python3 -c "
import json
items = json.load(open('docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.json'))
lines = ['# AIインフラテンプレート100本 マスタースペック', '', '| id | name | subCategory | format | activity |', '| --- | --- | --- | --- | --- |']
for it in items:
    lines.append(f\"| {it['id']} | {it['name']} | {it['subCategory']} | {it['format']} | {it.get('activity', '')} |\")
open('docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.md', 'w').write('\n'.join(lines) + '\n')
print('wrote master.md')
"
git add docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.md
git commit -m "$(printf 'docs: record AI infra template 100-item master spec\n\nOutput of the 10-cluster planning pass (Task 1-2 of the\nimplementation plan).\n\nRefs #576')"
```
Expected: commit succeeds; `git log -1 --stat` shows the new file.

---

### Task 3: タクソノミー許可リストの拡張

**Files:**
- Modify: `tests/unit/test_template_taxonomy.py:127-138`

- [ ] **Step 1: 拡張前に現状のテストが通ることを確認する**

Run: `uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: `2 passed`

- [ ] **Step 2: `ALLOWED_SUBCATEGORIES["ai"]` に新規7サブカテゴリを追加する**

`tests/unit/test_template_taxonomy.py` の `"ai": frozenset(...)` ブロック
(127-138行目) を以下に置き換える:

```python
    "ai": frozenset(
        {
                "APIゲートウェイ",
                "GPUクラスタ",
                "GPUコンテナ",
                "GPU基盤",
                "GPU監視",
                "MLOps",
                "NVIDIA DGX",
                "step-ca / Caddy",
                "エージェント基盤",
                "クラウドAI",
                "セキュリティ・ガバナンス",
                "データ基盤",
                "ベクトルDB",
                "モデル管理",
                "監視・可観測性",
                "推論サーバ",
        }
    ),
```

- [ ] **Step 3: テストを再実行して両方が通ることを確認する**

Run: `uv run pytest tests/unit/test_template_taxonomy.py -v`
Expected: `2 passed`（`test_registry_parses` は`templates.ts`が未変更のため
そのまま通り、`test_taxonomy_invariants` は新規サブカテゴリが許可リストに
入ったことで将来のTask 5追加分を受理できる状態になる）

- [ ] **Step 4: コミットする**

```bash
git add tests/unit/test_template_taxonomy.py
git commit -m "$(cat <<'EOF'
test(taxonomy): allow 7 new ai sub-categories for the 100-template expansion

Adds GPUクラスタ / ベクトルDB / MLOps / 監視・可観測性 /
セキュリティ・ガバナンス / エージェント基盤 / クラウドAI / データ基盤 to
ALLOWED_SUBCATEGORIES["ai"] ahead of the Task 5 templates.ts additions.

Refs #576
EOF
)"
```

---

### Task 4: ダイナミックワークフローによる並行生成・自己検証

**Files:**
- Create: `assets/examples/<id>.j2` × 100
- Create: `assets/examples/<id>.<format>` × 100

- [ ] **Step 1: `Workflow`ツールを次のスクリプトで1回呼び出す**

`args` には Task 2 で生成した
`docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.json` の
中身（100件のJSON配列）をそのまま渡す。

```javascript
export const meta = {
  name: 'ai-infra-templates-100',
  description: 'Generate and self-verify 100 new ai-category templates',
  phases: [
    { title: 'Generate', detail: 'write <id>.j2 + data file per spec item' },
    { title: 'Verify', detail: 'local_render_check.py per item, repair loop up to 3x' },
  ],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    detail: { type: 'string' },
  },
  required: ['ok', 'detail'],
}

function contentPrompt(item) {
  return `command-ghostwriterのテンプレートライブラリに新規テンプレートを1件追加する。

id: ${item.id}
name: ${item.name}
desc: ${item.desc}
subCategory: ${item.subCategory}
format: ${item.format}
activity: ${item.activity || '(省略=build)'}
手順骨子: ${item.outline}

次の2ファイルを作成すること:
- assets/examples/${item.id}.${item.format} (データ定義ファイル)
- assets/examples/${item.id}.j2 (Jinja2テンプレート)

スタイルは既存の assets/examples/huggingface-model-cache.j2 と
assets/examples/huggingface-model-cache.toml を読んで踏襲すること
（6セクション構成: タイトル+導入 / ## 目的 / ## 用語解説 / ## シナリオ設定
または## 背景 / ## 手順(### 番号見出し+bashコードブロック) / ## 動作確認 /
## 注意事項）。

厳守事項（過去のレンダー失敗の再発防止）:
1. テンプレートで参照する変数は全てデータファイルに定義すること
   (strict undefined でエラーになる)
2. データがCSVの場合、空セルの有無で出力が変わる書き方
   (例: {% if r["x"] %}) をしないこと。使う場合は "-" 等の明示センチネル
   値を入れ {% if r["x"] != "-" %} のように比較すること
3. CSV行の添字に対して直接メソッド呼び出しをしないこと
   (例: r["x"].split(",") は禁止)。値は事前にCSV列として分解しておくか、
   シェル側 (tr/cut等) で分割すること
4. シェルの `&&` `<` `>` `"` などのメタ文字は、データ変数経由ではなく
   テンプレート本文にリテラルで書くこと (autoescapeでHTMLエンティティ化
   されるため)
5. 実在するコマンド・オプションのみを使うこと

作成後、このタスクは完了とする（検証は別ステップで行うので自分では
pytestを実行しなくてよい）。`
}

function verifyPrompt(id) {
  return `リポジトリルートで次を実行し、結果を報告せよ:

python3 scripts/local_render_check.py ${id}

終了コード0かつ出力に "1/1 pairs OK" を含む場合のみ ok=true。
それ以外は ok=false とし、detail に標準出力の失敗行をそのまま含めること。`
}

function repairPrompt(item, detail) {
  return `assets/examples/${item.id}.j2 と assets/examples/${item.id}.${item.format} を
scripts/local_render_check.py の検証に通るよう修正せよ。

検証エラー:
${detail}

修正前に両ファイルを読むこと。idやファイル名は変更しないこと。
修正後、自分でpytestやlocal_render_check.pyを再実行する必要はない
（検証は別ステップで行う）。`
}

async function verifyAndRepair(item) {
  let check = await agent(verifyPrompt(item.id), {
    label: `verify:${item.id}`,
    phase: 'Verify',
    schema: VERIFY_SCHEMA,
  })
  let attempt = 0
  while (check && !check.ok && attempt < 3) {
    await agent(repairPrompt(item, check.detail), {
      label: `repair:${item.id}`,
      phase: 'Generate',
    })
    check = await agent(verifyPrompt(item.id), {
      label: `verify:${item.id}`,
      phase: 'Verify',
      schema: VERIFY_SCHEMA,
    })
    attempt++
  }
  return { id: item.id, ok: !!(check && check.ok), detail: check ? check.detail : 'agent returned null', attempts: attempt }
}

const results = await pipeline(
  args,
  (item) => agent(contentPrompt(item), { label: `write:${item.id}`, phase: 'Generate' }),
  (_, item) => verifyAndRepair(item)
)

const failed = results.filter(Boolean).filter((r) => !r.ok)
if (failed.length) {
  log(`${failed.length}/100 templates still failing after repair loop: ${failed.map((f) => f.id).join(', ')}`)
}
return results
```

- [ ] **Step 2: Workflowの戻り値を確認する**

戻り値（`results`配列）を確認し、`ok: false` が残っている場合はそのidを
記録する。0件になるまで、該当idだけを再度 `Workflow({ scriptPath, args:
[failedItemsOnly], resumeFromRunId })` または個別の `Agent` 呼び出しで手動
修復し、`python3 scripts/local_render_check.py <id>` で確認する。

Expected: 最終的に100件全てで `ok: true`。

---

### Task 5: `templates.ts` へのMETA一括追加

**Files:**
- Modify: `web/src/lib/templates.ts:276`（`];` の直前に100行追加）

- [ ] **Step 1: マスタースペックからMETA行を生成する**

`today`は実行時の日付を使う（ハードコードしない）。既に`templates.ts`に登録済みのid（Task 4の content agent が計画の範囲外で先行登録した場合など）はスキップし、二重登録を防ぐ。

Run:
```bash
python3 -c "
import datetime, json, re
items = json.load(open('docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.json'))
today = datetime.date.today().isoformat()
existing_ids = set(re.findall(r'id: \"([^\"]+)\"', open('web/src/lib/templates.ts').read()))
lines = []
skipped = []
for it in items:
    if it['id'] in existing_ids:
        skipped.append(it['id'])
        continue
    activity_part = f\", activity: \\\"{it['activity']}\\\"\" if it.get('activity') else ''
    lines.append(
        f'  {{ id: \"{it[\"id\"]}\", name: \"{it[\"name\"]}\", desc: \"{it[\"desc\"]}\", '
        f'category: \"ai\", subCategory: \"{it[\"subCategory\"]}\", format: \"{it[\"format\"]}\", '
        f'output: \"markdown\"{activity_part}, updated: \"{today}\", live: true }},'
    )
open('/tmp/meta_lines.ts', 'w').write('\n'.join(lines) + '\n')
print(f'wrote {len(lines)} META lines, skipped {len(skipped)} already-registered ids: {skipped}')
"
```
Expected: `wrote 100 META lines, skipped 0 already-registered ids: []` (or `wrote 99 ... skipped 1 ...` if one id was already registered ahead of this step)

- [ ] **Step 2: `];` の直前に挿入する**

```bash
python3 -c "
path = 'web/src/lib/templates.ts'
text = open(path).read()
marker = '];\n'
idx = text.index(marker)
new_lines = open('/tmp/meta_lines.ts').read()
text = text[:idx] + new_lines + text[idx:]
open(path, 'w').write(text)
"
grep -c '{ id: "' web/src/lib/templates.ts
```
Expected: `346`（既存246 + 新規100）

- [ ] **Step 3: コミットする**

```bash
git add web/src/lib/templates.ts
git commit -m "$(cat <<'EOF'
feat(templates): register 100 new ai-category templates in the library

Adds META entries for the 100 templates generated in Task 4, spanning
GPU cluster infra, model conversion, inference engines, vector DB,
MLOps, observability, security/governance, agent/RAG infra, cloud AI,
and data infra.

Refs #576
EOF
)"
```

---

### Task 6: 全体検証

- [ ] **Step 1: レンダーテストとタクソノミーテストを実行する**

Run: `uv run pytest tests/unit/test_example_templates_render.py tests/unit/test_template_taxonomy.py -v`
Expected: 全件PASS（346件のレンダーペア + タクソノミー2テスト）

- [ ] **Step 2: `local_render_check.py`を新規100件に対して実行する**

```bash
python3 scripts/local_render_check.py $(python3 -c "import json; print(' '.join(i['id'] for i in json.load(open('docs/superpowers/specs/2026-07-17-ai-infra-templates-100-master.json'))))")
```
Expected: `100/100 pairs OK`

- [ ] **Step 3: 利用可能なら他のlint/型チェックも実行する**

Run（実行可能なもののみ。ネットワーク制約で実行できないものはスキップし、
その旨を最終報告に明記する）:
```bash
cd web && npx tsc --noEmit; cd -
uv run ruff check .
```

- [ ] **Step 4: いずれかが失敗した場合**

失敗したテンプレートidを特定し、Task 4のrepairプロンプトと同じ要領で
`assets/examples/<id>.j2` / データファイルを直接Editツールで修正し、
Step 1-2を再実行する。全て通るまでコミットしない。

---

### Task 7: 分割コミット済み変更のpush

- [ ] **Step 1: 最終状態を確認する**

Run: `git status --short && git log --oneline -10`
Expected: クリーンなworking tree、Task 2/3/5のコミットが`claude/ai-infra-templates-100-cr1919`上に並んでいる

- [ ] **Step 2: pushする**

Run: `git push -u origin claude/ai-infra-templates-100-cr1919`
Expected: push成功。ネットワークエラー時のみ指数バックオフ(2s/4s/8s/16s)で
最大4回リトライする

- [ ] **Step 3: 作業ファイルの後始末を確認する**

`docs/superpowers/specs/2026-07-17-cluster-*.json` と
`.../ai-infra-templates-100-master.json` はコミット対象外の中間生成物
（`.md`版のみコミット済み）であることを確認し、`git status`がクリーンで
あることを再確認する。PRはオーナーからの明示的な依頼があるまで作成しない。

---

## Self-Review

- **Spec coverage**: 設計doc（`2026-07-17-ai-infra-templates-100-design.md`）
  の「実行体制」6項目は Task 1〜7 に1:1で対応。「既知の落とし穴」4点は
  Task 4 の `contentPrompt`/`repairPrompt` に明記済み。タクソノミー拡張は
  Task 3、単一編集での`templates.ts`更新はTask 5、で満たしている。
- **Placeholder scan**: 各Taskのコマンド・スクリプトは実行可能な完全形で
  記載済み（"TBD"やコード無しの指示は含まない）。クラスタ表の
  `TOPIC_EXAMPLES` は設計docと同一の具体例を使用。
- **Type consistency**: `VERIFY_SCHEMA`のキー(`ok`/`detail`)はcontentPrompt
  ・repairPrompt・verifyAndRepairの全箇所で一致。META行生成の
  フィールド名(`id`/`name`/`desc`/`subCategory`/`format`/`activity`/
  `outline`)はTask 1のプロンプト出力キーと一致。
