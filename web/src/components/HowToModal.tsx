import type { ReactNode } from "react";
import { Button, Divider, Badge } from "../ds";
import { Icon } from "./Icon";

export interface HowToModalProps {
  open: boolean;
  onClose: () => void;
}

// HowToModal — first-run usage guide. Written for people who have never used a
// CLI tool: it explains the 2-file concept, walks through the 3 steps, shows a
// tiny worked example (input -> output), and introduces the Jinja syntax basics.

function SectionTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--cg-text)" }}>
      <Icon name={icon} size={16} color="var(--cg-red)" />
      {children}
    </h3>
  );
}

// A labelled code block (monospace, scrollable) used to show input/output samples.
function Code({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      {label && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--cg-text-faint)", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      )}
      <pre style={{ margin: 0, padding: "10px 12px", background: "var(--cg-bg-secondary)", border: "1px solid var(--cg-border)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6, color: "var(--cg-text)", overflow: "auto", whiteSpace: "pre" }}>
        {children}
      </pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ display: "grid", placeItems: "center", width: 26, height: 26, flexShrink: 0, borderRadius: "50%", background: "var(--cg-red)", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "var(--font-mono)" }}>{n}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "var(--cg-text)", marginBottom: 2 }}>{title}</div>
        <div style={{ color: "var(--cg-text-muted)", fontSize: "var(--text-sm)" }}>{children}</div>
      </div>
    </div>
  );
}

export function HowToModal({ open, onClose }: HowToModalProps) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.55)", backdropFilter: "blur(2px)", display: "grid", placeItems: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 680, maxHeight: "88vh", overflow: "auto", background: "var(--cg-bg)", border: "1px solid var(--cg-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", fontFamily: "var(--font-sans)", color: "var(--cg-text)" }}>

        {/* header */}
        <div style={{ position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--cg-border)", background: "var(--cg-bg)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-lg)", fontWeight: 700 }}>
            <Icon name="template-file" size={18} />使い方と構文
          </span>
          <span onClick={onClose} title="閉じる" style={{ cursor: "pointer", color: "var(--cg-text-muted)", fontSize: 22, lineHeight: 1 }}>×</span>
        </div>

        <div style={{ padding: "var(--space-6)", fontSize: "var(--text-sm)", lineHeight: 1.8 }}>

          {/* What this tool does */}
          <section>
            <SectionTitle icon="generate">このツールでできること</SectionTitle>
            <p style={{ margin: "0 0 8px" }}>
              <b>設定定義ファイル</b>（値）と <b>Jinjaテンプレート</b>（雛形）の2つから、CLIコマンドや作業手順書（Markdown）を自動生成します。
              値を差し替えるだけで、同じ形のコマンドを何度でも作り直せます。
            </p>
            <p style={{ margin: 0, color: "var(--cg-text-muted)" }}>
              <Icon name="server" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              インストール不要。すべてブラウザ内で動作し、入力したファイルが外部に送信されることはありません。
            </p>
          </section>

          <Divider variant="subtle" />

          {/* 3 steps */}
          <section>
            <SectionTitle icon="terminal">3ステップで生成</SectionTitle>
            <div style={{ display: "grid", gap: 14 }}>
              <Step n={1} title="設定定義ファイルを用意する（値）">
                変数の値を <code>TOML</code> / <code>YAML</code> / <code>CSV</code> のいずれかで書きます。左ペインで形式を選んで貼り付けます。
              </Step>
              <Step n={2} title="Jinjaテンプレートを用意する（雛形）">
                コマンドや手順書の雛形を書き、値を埋めたい場所に <code>{"{{ 変数名 }}"}</code> を置きます。
              </Step>
              <Step n={3} title="生成してダウンロードする">
                入力すると右ペインに結果がリアルタイム表示されます。<b>コピー</b>してターミナルに貼り付けるか、<b>ダウンロード</b>で保存します。
              </Step>
            </div>
          </section>

          <Divider variant="subtle" />

          {/* worked example */}
          <section>
            <SectionTitle icon="topology">具体例で見る</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Code label="① 設定定義ファイル（TOML）">{`hostname = "rtx-01"
vlans = [10, 20, 30]`}</Code>
              <Code label="② Jinjaテンプレート（.j2）">{`hostname {{ hostname }}
{% for v in vlans %}
vlan {{ v }}
{% endfor %}`}</Code>
            </div>
            <Code label="→ 生成される結果">{`hostname rtx-01
vlan 10
vlan 20
vlan 30`}</Code>
          </section>

          <Divider variant="subtle" />

          {/* Jinja basics */}
          <section>
            <SectionTitle icon="template-file">テンプレートの書き方（Jinja 入門）</SectionTitle>
            <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
              <li><code>{"{{ 変数名 }}"}</code> … 値を1つ差し込む。例: <code>{"{{ hostname }}"}</code> → <code>rtx-01</code></li>
              <li><code>{"{% for x in items %} … {% endfor %}"}</code> … リストの数だけ繰り返す。</li>
              <li><code>{"{% if 条件 %} … {% endif %}"}</code> … 条件を満たすときだけ出力する。</li>
              <li><code>{"{{ vlans | join(',') }}"}</code> … フィルタで加工する。例の結果は <code>10,20,30</code></li>
            </ul>
          </section>

          <Divider variant="subtle" />

          {/* tips for CLI beginners */}
          <section>
            <SectionTitle icon="ghost">CLI操作がはじめての方へ</SectionTitle>
            <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
              <li><Badge tone="neutral">おすすめ</Badge> まずは <b>「サンプルで試す」</b> から。実際の入力と結果を30秒で体験できます。</li>
              <li>形式（TOML/YAML/CSV）は左ペインで明示的に選びます。解析に失敗すると、<b>行番号</b>と「実際にパースできる形式」を提示します。</li>
              <li>生成された結果は、そのままコマンドとして<b>ターミナルに貼り付けて実行</b>できます（手順書はMarkdown）。</li>
              <li>右ペインの <b>手順書 / Raw / 設定デバッグ</b> は、入力を編集するたびに自動で作り直されます。</li>
            </ul>
          </section>

        </div>

        <div style={{ position: "sticky", bottom: 0, display: "flex", justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid var(--cg-border)", background: "var(--cg-bg)" }}>
          <Button variant="primary" onClick={onClose}>閉じる</Button>
        </div>
      </div>
    </div>
  );
}
