import React from 'react';
import { Badge } from '../ds';
import { Icon } from './Icon';
import { CGTemplates } from '../lib/templates';
import type { Template, TemplateActivity, TemplateCategory, TemplateOutput } from '../lib/types';
import type { Format } from '../lib/format';
import logoMark from '../assets/brand/logo-mark.svg';

// Library — template gallery. Left category rail + right card grid + 空から作成.
// Picking a card calls onOpen(template); 空から作成 calls onOpen(null).

export interface RailEntry {
  id: string;
  label: string;
  icon: string;
  group?: string;
  filter: (t: Template) => boolean;
}

// Vendor labels must match `subCategory` values in templates.ts exactly.
// Explicit, reviewable list — not derived by scanning templates.ts at
// runtime, same reasoning as the ACTS array below.
const NETWORK_VENDORS: { id: string; label: string }[] = [
  { id: 'cisco', label: 'Cisco' },
  { id: 'yamaha', label: 'YAMAHA' },
  { id: 'juniper', label: 'Juniper' },
  { id: 'fortinet', label: 'Fortinet' },
  { id: 'allied-telesis', label: 'Allied Telesis' },
  { id: 'nec', label: 'NEC' },
  { id: 'arista', label: 'Arista' },
  { id: 'dell', label: 'Dell' },
  { id: 'hpe-aruba', label: 'HPE Aruba' },
  { id: 'alaxala', label: 'Alaxala' },
  { id: 'palo-alto', label: 'Palo Alto Networks' },
  { id: 'sonicwall', label: 'SonicWall' },
  { id: 'ubiquiti', label: 'Ubiquiti' },
];
const NETWORK_VENDOR_LABELS = new Set(NETWORK_VENDORS.map((v) => v.label));
const SERVER_DISTRO_LABELS = new Set(['Debian系', 'RHEL系']);

export const RAIL: RailEntry[] = [
  { id: 'all', label: 'すべて', icon: 'topology', filter: () => true },
  ...NETWORK_VENDORS.map(
    (v): RailEntry => ({
      id: `network-${v.id}`,
      label: v.label,
      icon: 'router',
      group: 'ネットワーク機器',
      filter: (t) => t.category === 'network' && t.subCategory === v.label,
    }),
  ),
  {
    id: 'network-common',
    label: 'ネットワーク機器 (共通)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) => t.category === 'network' && !NETWORK_VENDOR_LABELS.has(t.subCategory),
  },
  {
    id: 'server-common',
    label: 'サーバ (共通)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && !SERVER_DISTRO_LABELS.has(t.subCategory),
  },
  {
    id: 'server-debian',
    label: 'サーバ (Debian系)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && t.subCategory === 'Debian系',
  },
  {
    id: 'server-rhel',
    label: 'サーバ (RHEL系)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && t.subCategory === 'RHEL系',
  },
  { id: 'dns', label: 'DNS', icon: 'ethernet-port', filter: (t) => t.category === 'dns' },
  { id: 'ai', label: 'AIインフラ', icon: 'terminal', filter: (t) => t.category === 'ai' },
  { id: 'ops', label: '運用共通', icon: 'config-file', filter: (t) => t.category === 'ops' },
  { id: 'facility', label: '物理設備', icon: 'server', filter: (t) => t.category === 'facility' },
];

// Activity axis (orthogonal to the domain category). "すべて" clears the filter.
// A template with no `activity` is treated as "build". The "障害対応" chip
// generalizes the old runbook cross-cut: it surfaces troubleshoot templates
// across every domain, not a fixed category.
const ACTS: { id: TemplateActivity | 'all'; label: string }[] = [
  { id: 'all',               label: 'すべて' },
  { id: 'build',             label: '構築・設定' },
  { id: 'troubleshoot',      label: '障害対応' },
  { id: 'security-response', label: 'セキュリティ対応' },
  { id: 'change',            label: '変更・リリース' },
  { id: 'routine',           label: '定期運用' },
  { id: 'drill',             label: '訓練' },
];
const activityOf = (t: Template): TemplateActivity => t.activity ?? 'build';
const FMT_TONE: Record<Format, 'brand' | 'info' | 'warning'> = { toml: 'brand', yaml: 'info', csv: 'warning' };
const OUT_LABEL: Record<TemplateOutput, string> = { cli: 'CLI', config: 'config', markdown: 'Markdown' };

const DOMAIN_ORDER: TemplateCategory[] = ['network', 'server', 'dns', 'ai', 'ops', 'facility'];

// Group templates into ordered sub-category sections. Groups are ordered by
// their category (so same-category sub-categories stay adjacent, even in the
// "すべて" view) and, within that, by first appearance; template order inside a
// group is preserved.
export function groupBySubCategory(list: Template[]): { key: string; label: string; items: Template[] }[] {
  const sorted = [...list].sort((a, b) => DOMAIN_ORDER.indexOf(a.category) - DOMAIN_ORDER.indexOf(b.category));
  const groups: { key: string; label: string; items: Template[] }[] = [];
  for (const t of sorted) {
    // Group by (category, subCategory), not sub-category text alone: the same
    // sub-category name (e.g. "監視") can legitimately appear under more than one
    // domain, and those must stay separate sections in the "すべて" view.
    const key = `${t.category}/${t.subCategory}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: t.subCategory, items: [] };
      groups.push(g);
    }
    g.items.push(t);
  }
  return groups;
}

export function countByCategory(list: Template[], id: TemplateCategory | 'all'): number {
  return id === 'all' ? list.length : list.filter((t) => t.category === id).length;
}

export function countByActivity(list: Template[], id: TemplateActivity | 'all'): number {
  return id === 'all' ? list.length : list.filter((t) => activityOf(t) === id).length;
}

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
  const [act, setAct] = React.useState<TemplateActivity | 'all'>('all');
  const all = CGTemplates;
  const byCat = cat === 'all' ? all : all.filter((t) => t.category === cat);
  const list = act === 'all' ? byCat : byCat.filter((t) => activityOf(t) === act);
  const groups = groupBySubCategory(list);
  // Both rails count within the OTHER axis's current selection, so each number
  // matches what the grid shows: category counts respect the active activity,
  // activity counts respect the active category.
  const byAct = act === 'all' ? all : all.filter((t) => activityOf(t) === act);
  const count = (id: TemplateCategory | 'all') => countByCategory(byAct, id);
  const actCount = (id: TemplateActivity | 'all') => countByActivity(byCat, id);

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
                onClick={() => { setCat(c.id); setAct('all'); }}
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
          {/* activity (目的) filter chips — orthogonal to the left domain rail */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 22 }}>
            <span style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--cg-text-faint)', fontWeight: 700, marginRight: 2 }}>目的</span>
            {ACTS.map((a) => {
              const on = a.id === act;
              const n = actCount(a.id);
              const empty = n === 0 && a.id !== 'all';
              return (
                <button
                  key={a.id}
                  onClick={() => setAct(a.id)}
                  disabled={empty}
                  style={{
                    cursor: empty ? 'default' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: on ? 'rgba(255,75,75,.1)' : 'transparent',
                    border: `1px solid ${on ? 'var(--cg-red)' : 'var(--cg-border)'}`,
                    borderRadius: 999,
                    padding: '5px 12px',
                    color: on ? 'var(--cg-red-tint)' : empty ? 'var(--cg-text-faint)' : 'var(--cg-text-muted)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: on ? 600 : 400,
                    opacity: empty ? 0.5 : 1,
                  }}
                >
                  <span>{a.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--cg-text-faint)', fontFamily: 'var(--font-mono)' }}>{n}</span>
                </button>
              );
            })}
          </div>
          {/* 空から作成 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(244px, 1fr))', gap: 14, marginBottom: 28 }}>
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
          </div>

          {/* sub-category sections */}
          {groups.map((g) => (
            <section key={g.key} style={{ marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 0 12px', paddingBottom: 6, borderBottom: '1px solid var(--cg-border)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--cg-text)' }}>{g.label}</span>
                <span style={{ fontSize: 11, color: 'var(--cg-text-faint)', fontFamily: 'var(--font-mono)' }}>{g.items.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(244px, 1fr))', gap: 14 }}>
                {g.items.map((t) => (
                  <TemplateCard key={t.id} tpl={t} onOpen={onOpen} />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
