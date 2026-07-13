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
  { id: "file-permissions", name: "ファイルパーミッションと所有者管理", desc: "rwxと8進表記、setgidによるグループ継承を、chmod/chownを使った部門共有ディレクトリ設計の手順書（Markdown）として生成。", category: "server", subCategory: "パーミッション", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "connectivity-check", name: "ping・tracerouteによる疎通確認", desc: "自分→GW→外部IP→FQDNの順に疎通を切り分ける、pingとtracerouteによる標準チェック手順書（Markdown）を生成。", category: "network", subCategory: "疎通確認", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
  { id: "systemd-unit-basics", name: "systemdサービスの基本操作とユニット作成", desc: "start/stop/enableの違いとdaemon-reloadの意味を、自作スクリプトのサービス化を通じて学ぶ手順書（Markdown）を生成。", category: "server", subCategory: "systemd基本", format: "toml", output: "markdown", updated: "2026-07-13", live: true },
  { id: "port-listening-check", name: "ssとncによるポート待受・疎通確認", desc: "LISTEN状態の読み方とL4疎通テストを、ssとnc/curlを使った点検手順書（Markdown）として生成。", category: "network", subCategory: "ポート確認", format: "csv", output: "markdown", updated: "2026-07-13", live: true },
];

export const CGTemplates: Template[] = META.map((m) => ({
  ...m,
  data: file(m.id, m.format),
  template: file(m.id, "j2"),
}));
