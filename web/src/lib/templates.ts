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
