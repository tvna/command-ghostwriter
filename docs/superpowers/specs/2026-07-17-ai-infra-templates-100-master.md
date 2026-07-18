# AIインフラテンプレート100本 マスタースペック

Issue #576 / 実装計画 `docs/superpowers/plans/2026-07-17-ai-infra-templates-100.md` の Task 1-2 の出力。

| id | name | subCategory | format | activity |
| --- | --- | --- | --- | --- |
| slurm-gpu-gres-setup | SlurmのGRESによるGPU資源定義と割り当て | GPUクラスタ | toml |  |
| slurm-topology-aware-scheduling | Slurmトポロジ考慮スケジューリングの設定 | GPUクラスタ | yaml |  |
| nccl-allreduce-benchmark | NCCLによるマルチノード集合通信ベンチマーク | GPUクラスタ | toml |  |
| dcgm-gpu-health-monitoring | DCGMによるGPUヘルスチェックと常時監視 | GPUクラスタ | yaml |  |
| k8s-gpu-operator-deploy | GPU OperatorによるGPUノードの自動管理 | GPUクラスタ | yaml |  |
| k8s-gpu-node-drain | GPUノードの安全なドレインと保守復帰 | GPUクラスタ | csv |  |
| nvlink-fabric-manager-ops | NVLink構成確認とFabric Manager運用 | GPUクラスタ | toml |  |
| infiniband-fabric-health-check | InfiniBandファブリックの定期健全性点検 | GPUクラスタ | csv | routine |
| gpu-xid-error-triage | Xidエラーに基づくGPU故障の切り分け | GPUクラスタ | csv | troubleshoot |
| rack-power-capacity-design | GPUラックの電源容量設計と実測検証 | GPUクラスタ | csv |  |
| dvc-dataset-versioning | DVCによるデータセットのバージョン管理 | データ基盤 | toml |  |
| duckdb-dataset-etl | DuckDBによるトレーニングデータのETL処理 | データ基盤 | yaml |  |
| training-data-dedup | 学習データの重複排除とハッシュ検査 | データ基盤 | csv |  |
| label-studio-setup | Label Studioによるラベリング基盤の構築 | データ基盤 | yaml |  |
| pdf-text-extraction | poppler-utilsによるPDFテキスト抽出 | データ基盤 | csv |  |
| image-preprocessing-batch | ImageMagickによる学習用画像の一括前処理 | データ基盤 | toml |  |
| webdataset-shard-build | マルチモーダル学習データのtarシャード構築 | データ基盤 | yaml |  |
| csv-data-quality-check | csvkitによるデータ品質の定期検査 | データ基盤 | csv | routine |
| eval-dataset-split | 評価用データセットの分割とサンプリング | データ基盤 | toml |  |
| dataset-encoding-triage | テキストデータの文字化けの切り分け | データ基盤 | csv | troubleshoot |
| gguf-model-conversion | llama.cppによるGGUF変換と量子化 | モデル管理 | toml |  |
| onnx-model-export | OptimumによるONNXエクスポートと推論検証 | モデル管理 | toml |  |
| awq-gptq-quantization | AWQ・GPTQによるLLM量子化とモデル保存 | モデル管理 | yaml |  |
| lora-adapter-merge | LoRAアダプタのマージと配布用モデル生成 | モデル管理 | yaml |  |
| safetensors-migration | PyTorchモデルのsafetensors形式移行 | モデル管理 | csv |  |
| model-artifact-signing | cosignによるモデル成果物の署名と検証 | モデル管理 | toml |  |
| minio-model-distribution | MinIOによる学習済みモデルの社内配布 | モデル管理 | yaml |  |
| mlflow-model-registry | MLflowモデルレジストリによるバージョン管理 | モデル管理 | toml |  |
| model-card-audit | モデルカードとライセンス表記の定期棚卸し | モデル管理 | csv | routine |
| quant-quality-triage | 量子化モデルの品質劣化の切り分け | モデル管理 | csv | troubleshoot |
| triton-model-repository-deploy | Tritonサーバによるモデルリポジトリ配備 | 推論サーバ | yaml |  |
| tgi-server-deploy | TGIによるLLM推論サーバの構築と運用 | 推論サーバ | yaml |  |
| sglang-server-deploy | SGLangによる高速LLM推論サーバの構築 | 推論サーバ | toml |  |
| tensorrt-llm-engine-build | TensorRT-LLMエンジンのビルドと配備 | 推論サーバ | yaml |  |
| llama-cpp-server-deploy | llama.cppサーバによるローカルLLM配信 | 推論サーバ | toml |  |
| whisper-asr-server-deploy | whisper.cppによる音声認識サーバの構築 | 推論サーバ | toml |  |
| inference-canary-release | 新モデルのカナリアデプロイと段階移行 | 推論サーバ | csv |  |
| llm-ab-test-comparison | LLM新旧モデルのA/Bテスト比較評価 | 推論サーバ | csv |  |
| inference-gpu-oom-triage | 推論サーバのGPUメモリ不足の切り分け | 推論サーバ | toml | troubleshoot |
| inference-endpoint-inventory | 推論エンドポイントの定期棚卸し点検 | 推論サーバ | csv | routine |
| qdrant-collection-setup | Qdrantの導入とコレクション作成・検索の基本 | ベクトルDB | toml |  |
| milvus-standalone-deploy | Milvusスタンドアロン構築とインデックス作成 | ベクトルDB | yaml |  |
| weaviate-hybrid-search | Weaviateのスキーマ設計とハイブリッド検索 | ベクトルDB | yaml |  |
| pgvector-hnsw-index | pgvector導入とHNSWインデックス設計 | ベクトルDB | toml |  |
| elasticsearch-knn-search | ElasticsearchのkNNベクトル検索構築 | ベクトルDB | yaml |  |
| text-chunking-pipeline | RAG向けドキュメントのチャンク分割パイプライン | ベクトルDB | csv |  |
| embedding-batch-generation | embeddingバッチ生成とベクトルDB一括登録 | ベクトルDB | csv |  |
| vector-index-rebuild | ベクトルインデックスの定期再構築と最適化 | ベクトルDB | csv | routine |
| vector-search-quality-eval | ベクトル検索の精度評価とパラメータ調整 | ベクトルDB | csv |  |
| vector-search-latency-triage | ベクトル検索の遅延・低精度切り分け | ベクトルDB | toml | troubleshoot |
| mlflow-tracking-server | MLflowトラッキングサーバの構築と実験記録管理 | MLOps | yaml |  |
| dvc-data-versioning | DVCによるデータセットのバージョン管理 | MLOps | toml |  |
| wandb-selfhost-server | W&Bセルフホストサーバの構築と実験可視化 | MLOps | toml |  |
| feast-feature-store | Feastによるフィーチャーストアの構築運用 | MLOps | yaml |  |
| airflow-ml-pipeline | Airflowによる機械学習パイプラインの定期実行 | MLOps | yaml |  |
| distributed-training-torchrun | torchrunによるマルチノード分散学習ジョブ管理 | MLOps | csv |  |
| training-checkpoint-cleanup | 学習チェックポイントの定期棚卸しと容量整理 | MLOps | csv | routine |
| optuna-hyperparameter-search | Optunaによるハイパーパラメータ探索の運用 | MLOps | toml |  |
| ml-experiment-reproducibility | 機械学習実験の再現性確保と環境固定 | MLOps | toml |  |
| training-job-failure-triage | 分散学習ジョブ失敗の切り分けと復旧 | MLOps | csv | troubleshoot |
| langfuse-selfhost-deploy | Langfuseセルフホスト構築とLLMトレース収集 | 監視・可観測性 | yaml |  |
| litellm-prompt-logging | LiteLLM Proxyのプロンプト・応答ロギング設定 | 監視・可観測性 | yaml |  |
| llm-token-usage-dashboard | vLLM推論APIのトークン使用量ダッシュボード構築 | 監視・可観測性 | csv |  |
| dcgm-exporter-grafana | DCGM ExporterによるGPUクラスタのGrafana監視 | 監視・可観測性 | yaml |  |
| llm-latency-slo-alert | 推論APIレイテンシのSLO定義とアラート設定 | 監視・可観測性 | toml |  |
| llm-capacity-planning-review | 推論基盤キャパシティの定期棚卸しと増設計画 | 監視・可観測性 | csv | routine |
| llm-inference-outage-triage | 推論API無応答時の障害切り分け | 監視・可観測性 | toml | troubleshoot |
| llm-error-rate-spike-triage | 推論APIエラー率急上昇の切り分け | 監視・可観測性 | toml | troubleshoot |
| llm-cost-anomaly-triage | LLM利用コスト急増の検知と切り分け | 監視・可観測性 | csv | troubleshoot |
| vllm-oom-crash-triage | vLLMのCUDA OOMクラッシュ切り分け | 監視・可観測性 | toml | troubleshoot |
| prompt-injection-guardrails | プロンプトインジェクションを防ぐガードレール構築 | セキュリティ・ガバナンス | yaml |  |
| pii-redaction-presidio | PresidioによるPIIの検出とマスキング | セキュリティ・ガバナンス | yaml |  |
| model-access-control-policy | OPAによるモデルアクセス制御ポリシーの整備 | セキュリティ・ガバナンス | yaml |  |
| llm-prompt-audit-logging | LLMプロンプト監査ログの収集と改ざん防止 | セキュリティ・ガバナンス | toml |  |
| model-api-key-rotation | モデルAPIキーの定期ローテーション | セキュリティ・ガバナンス | toml | routine |
| model-artifact-supply-chain-scan | モデル成果物のサプライチェーン検証 | セキュリティ・ガバナンス | toml |  |
| llm-red-team-garak | garakによるLLM脆弱性レッドチーム演習 | セキュリティ・ガバナンス | csv | drill |
| jailbreak-incident-response | プロンプトインジェクション被害のインシデント対応 | セキュリティ・ガバナンス | csv | security-response |
| data-exfiltration-response | LLM経由データ漏洩のインシデント対応 | セキュリティ・ガバナンス | csv | security-response |
| ai-service-compromise-recovery-drill | AIサービス侵害からの復旧訓練 | セキュリティ・ガバナンス | csv | drill |
| qdrant-rag-collection | RAG向けQdrantベクトルDBの構築とコレクション設計 | エージェント基盤 | yaml |  |
| mcp-server-hosting | MCPサーバのsystemd常駐ホスティング | エージェント基盤 | toml |  |
| langgraph-agent-server | LangGraphエージェントサーバの構築とデプロイ | エージェント基盤 | yaml |  |
| mcp-tool-gateway | mcpoによるMCPツールのAPIゲートウェイ公開 | エージェント基盤 | csv |  |
| prompt-template-registry | Gitによるプロンプトテンプレートの版管理 | エージェント基盤 | csv |  |
| agent-session-store | Redisによるエージェント会話セッションの永続化 | エージェント基盤 | toml |  |
| langfuse-llm-tracing | LangfuseによるLLMツール呼び出しの監視基盤構築 | エージェント基盤 | yaml |  |
| playwright-headless-setup | Playwrightによるヘッドレスブラウザ自動化基盤 | エージェント基盤 | toml |  |
| rag-retrieval-triage | RAG検索品質低下の切り分けとチューニング | エージェント基盤 | csv | troubleshoot |
| mcp-server-inventory | MCPサーバと公開ツールの定期棚卸し | エージェント基盤 | csv | routine |
| aws-bedrock-model-invocation | AWS Bedrock基盤モデルの呼び出しと利用設定 | クラウドAI | toml |  |
| sagemaker-realtime-endpoint-deploy | SageMakerリアルタイム推論エンドポイントの構築 | クラウドAI | yaml |  |
| azure-openai-deployment-setup | Azure OpenAI Serviceのリソース作成とモデルデプロイ | クラウドAI | toml |  |
| vertex-ai-model-deploy | Vertex AIへのモデル登録とエンドポイント公開 | クラウドAI | yaml |  |
| cloud-gpu-spot-training | スポットGPUインスタンスによるAI学習環境の構築 | クラウドAI | toml |  |
| cross-cloud-model-migration | クラウド間でのモデル成果物の移行 | クラウドAI | csv |  |
| multicloud-inference-failover | マルチクラウド推論エンドポイントの切替訓練 | クラウドAI | yaml | drill |
| cloud-ai-cost-review | クラウドAIサービスのコスト定期棚卸し | クラウドAI | csv | routine |
| ai-workload-iam-design | AIワークロード向けIAM最小権限設計 | クラウドAI | csv |  |
| sagemaker-endpoint-troubleshoot | SageMaker推論エンドポイントの障害切り分け | クラウドAI | toml | troubleshoot |
