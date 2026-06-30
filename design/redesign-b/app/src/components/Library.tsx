import React from 'react';
import { Badge } from '../ds';
import { Icon } from './Icon';
import { CGTemplates } from '../lib/templates';
import type { Template, TemplateCategory, TemplateOutput } from '../lib/types';
import type { Format } from '../lib/engine';
import logoMark from '../assets/brand/logo-mark.svg';

// Library — template gallery. Left category rail + right card grid + 空から作成.
// Picking a card calls onOpen(template); 空から作成 calls onOpen(null).

const CATS: { id: TemplateCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all',     label: 'すべて',          icon: 'topology' },
  { id: 'network', label: 'ネットワーク機器', icon: 'router' },
  { id: 'server',  label: 'サーバ / Linux',  icon: 'server' },
  { id: 'dns',     label: 'DNS',            icon: 'ethernet-port' },
  { id: 'runbook', label: '手順書',          icon: 'config-file' },
];
const FMT_TONE: Record<Format, 'brand' | 'info' | 'warning'> = { toml: 'brand', yaml: 'info', csv: 'warning' };
const OUT_LABEL: Record<TemplateOutput, string> = { cli: 'CLI', config: 'config', markdown: 'Markdown' };

function CatIcon({ name, size, color }: { name: string; size: number; color?: string }) {
  return <Icon name={name} size={size} color={color} />;
}

function TemplateCard({ tpl, onOpen }: { tpl: Template; onOpen: (tpl: Template) => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={() => onOpen(tpl)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cg-bg-secondary)',
        border: `1px solid ${hover ? 'var(--cg-red)' : 'var(--cg-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: 16,
        gap: 10,
        minHeight: 158,
        transition: 'border-color var(--dur-base), transform var(--dur-base)',
        transform: hover ? 'translateY(-2px)' : 'none',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--cg-bg)', border: '1px solid var(--cg-border)', display: 'grid', placeItems: 'center' }}>
          <CatIcon name={CATS.find((c) => c.id === tpl.category)!.icon} size={18} color="var(--cg-red)" />
        </span>
        {tpl.live && <Badge tone="success">ライブ</Badge>}
      </div>
      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--cg-text)', lineHeight: 1.35 }}>{tpl.name}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--cg-text-muted)', lineHeight: 1.55, flex: 1 }}>{tpl.desc}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Badge tone={FMT_TONE[tpl.format]}>{tpl.format.toUpperCase()}</Badge>
        <span style={{ fontSize: 10, color: 'var(--cg-text-faint)' }}>→</span>
        <Badge>{OUT_LABEL[tpl.output]}</Badge>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--cg-text-faint)', fontFamily: 'var(--font-mono)' }}>{tpl.updated}</span>
      </div>
    </button>
  );
}

export interface LibraryProps {
  onOpen: (tpl: Template | null) => void;
  onClose?: () => void;
}

export function Library({ onOpen, onClose }: LibraryProps) {
  const [cat, setCat] = React.useState<TemplateCategory | 'all'>('all');
  const all = CGTemplates;
  const list = cat === 'all' ? all : all.filter((t) => t.category === cat);
  const count = (id: TemplateCategory | 'all') => (id === 'all' ? all.length : all.filter((t) => t.category === id).length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--cg-bg)', fontFamily: 'var(--font-sans)', color: 'var(--cg-text)' }}>
      {/* app bar */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '0 18px', height: 56, borderBottom: '1px solid var(--cg-border)', flexShrink: 0 }}>
        <img src={logoMark} alt="" style={{ width: 30, height: 30, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', whiteSpace: 'nowrap' }}>Command ghostwriter</span>
        <div style={{ width: 1, height: 22, background: 'var(--cg-border)', margin: '0 4px' }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--cg-text-muted)' }}>テンプレートライブラリ</span>
        <div style={{ flex: 1 }} />
        {onClose && (
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'transparent', border: '1px solid var(--cg-border)', borderRadius: 'var(--radius-md)', color: 'var(--cg-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', padding: '6px 12px' }}>
            ← 戻る
          </button>
        )}
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* left category rail */}
        <nav style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--cg-border)', background: 'var(--cg-bg-secondary)', padding: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--cg-text-faint)', fontWeight: 700, padding: '4px 8px 10px' }}>カテゴリ</div>
          {CATS.map((c) => {
            const on = c.id === cat;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  background: on ? 'rgba(255,75,75,.1)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 9px',
                  marginBottom: 2,
                  color: on ? 'var(--cg-red-tint)' : 'var(--cg-text)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: on ? 600 : 400,
                  textAlign: 'left',
                }}
              >
                <CatIcon name={c.icon} size={16} color={on ? 'var(--cg-red)' : 'var(--cg-text-muted)'} />
                <span style={{ flex: 1 }}>{c.label}</span>
                <span style={{ fontSize: 11, color: 'var(--cg-text-faint)', fontFamily: 'var(--font-mono)' }}>{count(c.id)}</span>
              </button>
            );
          })}
        </nav>

        {/* right grid */}
        <main style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 'var(--space-8)' }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: '0 0 4px' }}>テンプレートから始める</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--cg-text-muted)', margin: '0 0 22px' }}>
            定型作業のテンプレートを選ぶと、データ定義とテンプレートを読み込んだ状態でエディタが開きます。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(244px, 1fr))', gap: 14 }}>
            {/* 空から作成 */}
            <button
              onClick={() => onOpen(null)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                minHeight: 158,
                background: 'transparent',
                border: '1px dashed var(--cg-border-strong)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--cg-text-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Icon name="generate" size={26} color="var(--cg-text-muted)" />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>空から作成</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--cg-text-faint)' }}>サンプルから書き始める</span>
            </button>
            {list.map((t) => (
              <TemplateCard key={t.id} tpl={t} onOpen={onOpen} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
