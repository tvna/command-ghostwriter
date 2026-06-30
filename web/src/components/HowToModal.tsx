import { Button, Divider } from "../ds";
import { Icon } from "./Icon";

export interface HowToModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowToModal({ open, onClose }: HowToModalProps) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.55)", backdropFilter: "blur(2px)", display: "grid", placeItems: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 620, maxHeight: "86vh", overflow: "auto", background: "var(--cg-bg)", border: "1px solid var(--cg-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", fontFamily: "var(--font-sans)", color: "var(--cg-text)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--cg-border)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-lg)", fontWeight: 700 }}>
            <Icon name="template-file" size={18} />使い方と構文
          </span>
          <span onClick={onClose} style={{ cursor: "pointer", color: "var(--cg-text-muted)", fontSize: 22, lineHeight: 1 }}>×</span>
        </div>
        <div style={{ padding: "var(--space-6)", fontSize: "var(--text-sm)", lineHeight: 1.8 }}>
          <p><b>2つのファイル</b>でコマンドや手順書を生成します。</p>
          <ol style={{ paddingLeft: 22 }}>
            <li><b>データ定義</b>（TOML / YAML / CSV）— 変数の値。</li>
            <li><b>Jinjaテンプレート</b> — <code>{"{{ 変数 }}"}</code> や <code>{"{% for x in items %}"}</code> で展開。</li>
          </ol>
          <Divider variant="subtle" />
          <p style={{ color: "var(--cg-text-muted)" }}>左ペインで形式を明示選択します。解析に失敗すると、行番号と「実際にパースできる形式」を提示します。右ペインの <b>手順書 / Raw / Visual Debug</b> は編集ごとに再生成されます。</p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid var(--cg-border)" }}>
          <Button variant="primary" onClick={onClose}>閉じる</Button>
        </div>
      </div>
    </div>
  );
}
