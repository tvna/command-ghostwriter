import type { Template, TemplateCategory, TemplateOutput } from "./types";
import type { Format } from "./format";

const raw = import.meta.glob("../../../assets/examples/*.{toml,yaml,csv,j2}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

function file(id: string, ext: string): string {
  const hit = Object.entries(raw).find(([k]) => k.endsWith(`/${id}.${ext}`));
  if (!hit) throw new Error(`example not found: ${id}.${ext}`);
  return hit[1];
}

interface Meta {
  id: string;
  name: string;
  desc: string;
  category: TemplateCategory;
  subCategory: string;
  format: Format;
  output: TemplateOutput;
  updated: string;
  live: boolean;
}

const META: Meta[] = [
  { id: "cisco-switchport", name: "Cisco スイッチポート設定", desc: "インターフェースの mode / VLAN / description から、CLI を含む設定手順書（Markdown）を生成。", category: "network", subCategory: "Cisco", format: "toml", output: "markdown", updated: "2026-06-28", live: true },
  { id: "yamaha-router", name: "YAMAHA ルータ初期構築", desc: "RTX系ルータの LAN / PPPoE / IPフィルタ / NAT 設定を、CLI を含む手順書（Markdown）として生成。", category: "network", subCategory: "YAMAHA", format: "toml", output: "markdown", updated: "2026-06-25", live: true },
  { id: "linux-init", name: "Linux 初期セットアップ", desc: "ホスト名・ユーザー・SSH・タイムゾーン・パッケージ・ufw の初期化を、CLI を含む手順書（Markdown）として生成。", category: "server", subCategory: "Ubuntu / Debian", format: "yaml", output: "markdown", updated: "2026-06-22", live: true },
  { id: "dns-zone", name: "DNS ゾーンファイル初期化", desc: "$ORIGIN / $TTL / SOA / NS / MX / A / 各種 TXT を含むゾーンを、登録・反映手順書（Markdown）として生成。", category: "dns", subCategory: "BIND", format: "toml", output: "markdown", updated: "2026-06-30", live: true },
  { id: "incident-campus", name: "キャンパスネットワーク障害対応", desc: "症状・影響範囲・切り分けステップ・エスカレーションから Markdown 手順書を生成。", category: "runbook", subCategory: "ネットワーク", format: "yaml", output: "markdown", updated: "2026-06-18", live: true },
  { id: "incident-proxy", name: "プロキシ環境のWebサービス接続不能", desc: "プロキシ設定・確認コマンド・判断分岐から Markdown 切り分け手順書を生成。", category: "runbook", subCategory: "プロキシ / Web", format: "yaml", output: "markdown", updated: "2026-06-15", live: true },
  { id: "firewall-rules", name: "firewalld ルール一括投入", desc: "CSV の 1 行 1 ルールから、Rocky Linux 標準の firewalld rich rule 投入手順書（Markdown）を生成。", category: "network", subCategory: "firewalld", format: "csv", output: "markdown", updated: "2026-06-30", live: true },
  { id: "dgx-spark-ollama", name: "DGX Spark + ollama 初期構築", desc: "DGX OS の初期設定・SSH 堅牢化・ufw から、ollama の LAN 内 API 公開・モデル取得までの手順書（Markdown）を生成。", category: "ai", subCategory: "NVIDIA DGX", format: "yaml", output: "markdown", updated: "2026-07-02", live: true },
  { id: "zero-trust-access", name: "ゼロトラストアクセス基盤構築", desc: "step-ca + Caddy の mTLS で AI マシンの API / SSH を保護する、商用利用可能な OSS 構成の構築手順書（Markdown）を生成。", category: "ai", subCategory: "step-ca / Caddy", format: "yaml", output: "markdown", updated: "2026-07-02", live: true },
  { id: "docker-basic-ops", name: "Dockerコンテナ基本操作", desc: "イメージの pull からコンテナ起動・ボリューム差し替え・破棄までのライフサイクル一巡を、CLI を含む手順書（Markdown）として生成。", category: "server", subCategory: "Docker", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "dns-resolve-troubleshoot", name: "名前解決トラブルの切り分け", desc: "「名前が引けない」障害をhostsファイル→スタブリゾルバ→キャッシュDNS→権威DNSの層に分解して切り分ける訓練用手順書", category: "runbook", subCategory: "DNS切り分け", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "kvm-snapshot-restore", name: "変更作業前のVMスナップショット取得と復元", desc: "KVM/libvirt 環境で、変更作業前にドメイン(VM)のスナップショットを取得し、失敗時にロールバックする手順です。", category: "runbook", subCategory: "KVMスナップショット", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "aws-ec2-basic-ops", name: "AWS CLIでEC2インスタンスを作成・停止・削除する", desc: "AWS CLIの認証設定からEC2の起動・SSH接続・停止・削除、残骸(SG/キーペア/EBS)確認までを一巡する手順書", category: "server", subCategory: "AWS CLI", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "dns-record-migration", name: "サーバ移転に伴うDNSレコード切替（TTL事前調整）", desc: "TTLを事前に短縮してからDNSレコードを新しい値へ切替え、digで新旧の反映状況を検証する手順", category: "dns", subCategory: "DNS切替", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "virsh-vm-lifecycle", name: "virshでLinux VMを作成して起動・停止する", desc: "libvirt/KVM ハイパーバイザー上に CLI だけで Linux VM を作成し、virsh で起動・停止・自動起動を管理する手順", category: "server", subCategory: "KVM/libvirt", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "aws-s3-backup-basics", name: "AWS CLIでS3バケットを作りバックアップを保管する", desc: "S3バケットの作成からバックアップの保管・取り出し検証、公開設定の安全確認までをAWS CLIで一巡する手順", category: "server", subCategory: "AWS CLI", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "dnsmasq-office-dns", name: "dnsmasqで小規模オフィスの内部DNSを立てる", desc: "dnsmasqで内部DNSとフォワーダを構成し、社内ホスト名解決とDNSキャッシュを提供する手順", category: "dns", subCategory: "dnsmasq", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "dns-secondary-transfer", name: "セカンダリDNSを追加してゾーン転送で冗長化する", desc: "プライマリ/セカンダリ構成のDNSでゾーン転送(AXFR/IXFR)とNOTIFYによる更新伝搬を設定・検証する", category: "dns", subCategory: "BIND冗長化", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "podman-rootless-service", name: "Podmanでrootlessコンテナを常時起動サービス化する", desc: "root権限なしでコンテナを実行し、systemdユーザーサービスとして再起動後も自動起動する構成をPodmanで作る手順", category: "server", subCategory: "Podman", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "file-permissions", name: "ファイルパーミッションと所有者管理", desc: "rwxと8進表記、setgidによるグループ継承を、chmod/chownを使った部門共有ディレクトリ設計の手順書（Markdown）として生成。", category: "server", subCategory: "パーミッション", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "connectivity-check", name: "ping・tracerouteによる疎通確認", desc: "自分→GW→外部IP→FQDNの順に疎通を切り分ける、pingとtracerouteによる標準チェック手順書（Markdown）を生成。", category: "network", subCategory: "疎通確認", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "systemd-unit-basics", name: "systemdサービスの基本操作とユニット作成", desc: "start/stop/enableの違いとdaemon-reloadの意味を、自作スクリプトのサービス化を通じて学ぶ手順書（Markdown）を生成。", category: "server", subCategory: "systemd基本", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "port-listening-check", name: "ssとncによるポート待受・疎通確認", desc: "LISTEN状態の読み方とL4疎通テストを、ssとnc/curlを使った点検手順書（Markdown）として生成。", category: "network", subCategory: "ポート確認", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "cron-scheduling", name: "cronによる定期実行ジョブの設定", desc: "crontabの5フィールド書式とPATH問題、-r事故の防止を、ログ出力付きジョブの登録・検証手順書（Markdown）として生成。", category: "server", subCategory: "cron", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "subnetting-basics", name: "IPアドレス設計とサブネット分割の基礎", desc: "CIDR表記とサブネットマスクの対応を、拠点要件からのサブネット分割設計とipcalcでの検証手順書（Markdown）として生成。", category: "network", subCategory: "IPアドレス設計", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "ntp-chrony", name: "chronyによるNTP時刻同期の設定", desc: "stratumやslew/stepの概念を踏まえ、chronyの導入・サーバ設定・同期状態検証までの手順書（Markdown）を生成。", category: "server", subCategory: "時刻同期", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "disk-mount-basics", name: "ディスクのフォーマットとマウント入門", desc: "ブロックデバイス→ファイルシステム→マウントの階層構造を、ループバックデバイスで安全に体験する手順書（Markdown）を生成。", category: "server", subCategory: "ディスク管理", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "disk-usage-triage", name: "ディスク使用率100%障害の切り分けと復旧", desc: "df/du/lsof/journalctlでディスク枯渇の原因を特定し、安全に領域回復する手順書（Markdown）を生成。", category: "runbook", subCategory: "ディスク", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "systemd-service-recovery", name: "systemdサービス起動失敗の調査と復旧", desc: "systemctl/journalctlでサービス起動失敗の原因を特定し、恒久復旧する手順書（Markdown）を生成。", category: "runbook", subCategory: "systemd復旧", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "cron-healthcheck", name: "cronとシェルスクリプトによる簡易死活監視の構築", desc: "CSVの監視対象一覧から、cron + logger による最小構成の死活監視スクリプトと登録手順書（Markdown）を生成。", category: "server", subCategory: "監視", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "load-spike-triage", name: "サーバ負荷急増時の一次切り分け", desc: "uptime/top/iostatでCPU起因・I/O起因・プロセス暴走を切り分け、対処判断基準表に沿って対応する手順書（Markdown）を生成。", category: "runbook", subCategory: "負荷", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "logrotate-setup", name: "logrotateによるログローテーション設定", desc: "CSVのログ定義からlogrotate設定を生成し、dry-run検証から適用までの手順書（Markdown）を生成。", category: "server", subCategory: "ログ運用", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "web-error-log-triage", name: "Webサーバの5xxエラー多発時のログ調査", desc: "アクセスログ/エラーログをawk/uniqで集計し、5xxエラーの原因を切り分ける手順書（Markdown）を生成。", category: "runbook", subCategory: "Webログ", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "oom-memory-triage", name: "メモリ枯渇・OOM Killer発動時の切り分け", desc: "free/journalctl -kからOOM Killer発動の証跡を調査し、犠牲プロセスを特定する手順書（Markdown）を生成。", category: "runbook", subCategory: "メモリ", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "mail-delivery-triage", name: "メール送信不能（Postfix）の切り分け", desc: "mailq/メールログ/MXレコード/ポート到達性の4層でメール配送不能の原因を切り分ける手順書（Markdown）を生成。", category: "runbook", subCategory: "メール", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "alert-first-response", name: "アラート一次対応の型（受信から報告まで）", desc: "種別別チェックリストに沿って事実確認・影響範囲把握・エスカレーション判断・報告を行う手順書（Markdown）を生成。", category: "runbook", subCategory: "一次対応", format: "yaml", output: "markdown", updated: "2026-07-13", live: true },
];

export const CGTemplates: Template[] = META.map((m) => ({
  ...m,
  data: file(m.id, m.format),
  template: file(m.id, "j2"),
}));
