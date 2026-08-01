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
  { id: 'opnsense', label: 'OPNsense' },
  { id: 'palo-alto', label: 'Palo Alto Networks' },
  { id: 'sonicwall', label: 'SonicWall' },
  { id: 'ubiquiti', label: 'Ubiquiti' },
];
const NETWORK_VENDOR_LABELS = new Set(NETWORK_VENDORS.map((v) => v.label));
const SERVER_SPLIT_LABELS = new Set(['Debian系', 'RHEL系', 'コンテナ']);

// network-common sub-clusters (each < 50 templates; see
// docs/superpowers/specs/2026-08-01-template-library-rail-rebalance-design.md).
// Disjoint by construction; ネットワーク機器 (基盤・その他) is the residual
// catch-all for every non-vendor subCategory not in the two sets below.
// "監視" is deliberately excluded: its sole network member (snmp-device-monitoring)
// is general SNMP device-health polling, not security monitoring — it falls
// through to ネットワーク機器 (基盤・その他) instead.
const NETWORK_SECURITY = new Set(['IDS・IPS', 'トラフィック分析', 'パケット解析']);
const NETWORK_VPN = new Set(['オーバーレイVPN', 'ZTNAオーバーレイ', 'トンネリング']);

// server-common sub-clusters — same disjoint-with-residual-catch-all pattern.
// サーバ (基盤運用) is the residual catch-all for every server subCategory not
// in SERVER_SPLIT_LABELS and not in the four sets below.
const SERVER_IDENTITY = new Set(['IAM・SSO', '認証', '証明書', 'sudo', 'パーミッション', 'ユーザー管理']);
const SERVER_PREVENTION = new Set(['侵入対策', 'シークレット管理', 'SELinux', 'AppArmor']);
const SERVER_DETECTION = new Set(['SIEM・HIDS', 'EDR・フォレンジック']);
const SERVER_AUDIT = new Set(['適合性監査', '資産・状態管理', 'ディスク管理', 'バックアップ', 'ログ運用']);

// middleware sub-clusters. Unbound (21 templates) is large enough to need
// its own entry; ミドルウェア (DNS共通) covers the rest of the DNS
// product/ops subCategories; ミドルウェア (ネットワークサービス) is the
// residual catch-all (プロキシ/Webサーバ/ロードバランサ/メール/データベース).
const MIDDLEWARE_DNS_COMMON = new Set([
  'BIND',
  'BIND冗長化',
  'DNSSEC',
  'DNS切り分け',
  'DNS切替',
  'PowerDNS',
  'dnsmasq',
  'レコード管理',
  '動的更新',
  '暗号化DNS',
  '監視',
]);

// ai sub-clusters. AIインフラ (運用・ガバナンス) is the residual catch-all
// for every ai subCategory not in the two sets below.
const AI_INFRA = new Set(['GPUクラスタ', 'GPU基盤', 'GPU監視', 'NVIDIA DGX', 'データ基盤', 'ベクトルDB']);
const AI_MODEL = new Set(['モデル管理', '推論サーバ', 'MLOps', 'エージェント基盤']);

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
    id: 'network-common-security',
    label: 'ネットワーク機器 (セキュリティ監視)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) => t.category === 'network' && NETWORK_SECURITY.has(t.subCategory),
  },
  {
    id: 'network-common-vpn',
    label: 'ネットワーク機器 (VPN・オーバーレイ)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) => t.category === 'network' && NETWORK_VPN.has(t.subCategory),
  },
  {
    id: 'network-common-other',
    label: 'ネットワーク機器 (基盤・その他)',
    icon: 'router',
    group: 'ネットワーク機器',
    filter: (t) =>
      t.category === 'network' &&
      !NETWORK_VENDOR_LABELS.has(t.subCategory) &&
      !NETWORK_SECURITY.has(t.subCategory) &&
      !NETWORK_VPN.has(t.subCategory),
  },
  {
    id: 'server-common-identity',
    label: 'サーバ (ID・アクセス管理)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && SERVER_IDENTITY.has(t.subCategory),
  },
  {
    id: 'server-common-prevention',
    label: 'サーバ (予防・防御)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && SERVER_PREVENTION.has(t.subCategory),
  },
  {
    id: 'server-common-detection',
    label: 'サーバ (検知・対応)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && SERVER_DETECTION.has(t.subCategory),
  },
  {
    id: 'server-common-audit',
    label: 'サーバ (監査・資産)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && SERVER_AUDIT.has(t.subCategory),
  },
  {
    id: 'server-common-ops',
    label: 'サーバ (基盤運用)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) =>
      t.category === 'server' &&
      !SERVER_SPLIT_LABELS.has(t.subCategory) &&
      !SERVER_IDENTITY.has(t.subCategory) &&
      !SERVER_PREVENTION.has(t.subCategory) &&
      !SERVER_DETECTION.has(t.subCategory) &&
      !SERVER_AUDIT.has(t.subCategory),
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
  {
    id: 'server-container',
    label: 'サーバ (コンテナ)',
    icon: 'server',
    group: 'サーバ',
    filter: (t) => t.category === 'server' && t.subCategory === 'コンテナ',
  },
  {
    id: 'middleware-unbound',
    label: 'ミドルウェア (Unbound)',
    icon: 'ethernet-port',
    group: 'ミドルウェア',
    filter: (t) => t.category === 'middleware' && t.subCategory === 'Unbound',
  },
  {
    id: 'middleware-dns',
    label: 'ミドルウェア (DNS共通)',
    icon: 'ethernet-port',
    group: 'ミドルウェア',
    filter: (t) => t.category === 'middleware' && MIDDLEWARE_DNS_COMMON.has(t.subCategory),
  },
  {
    id: 'middleware-services',
    label: 'ミドルウェア (ネットワークサービス)',
    icon: 'ethernet-port',
    group: 'ミドルウェア',
    filter: (t) =>
      t.category === 'middleware' &&
      t.subCategory !== 'Unbound' &&
      !MIDDLEWARE_DNS_COMMON.has(t.subCategory),
  },
  {
    id: 'ai-infra',
    label: 'AIインフラ (基盤・GPU)',
    icon: 'terminal',
    group: 'AIインフラ',
    filter: (t) => t.category === 'ai' && AI_INFRA.has(t.subCategory),
  },
  {
    id: 'ai-model',
    label: 'AIインフラ (モデル・推論)',
    icon: 'terminal',
    group: 'AIインフラ',
    filter: (t) => t.category === 'ai' && AI_MODEL.has(t.subCategory),
  },
  {
    id: 'ai-ops',
    label: 'AIインフラ (運用・ガバナンス)',
    icon: 'terminal',
    group: 'AIインフラ',
    filter: (t) => t.category === 'ai' && !AI_INFRA.has(t.subCategory) && !AI_MODEL.has(t.subCategory),
  },
  { id: 'ops', label: '運用共通', icon: 'config-file', group: 'その他', filter: (t) => t.category === 'ops' },
  { id: 'facility', label: '物理設備', icon: 'server', group: 'その他', filter: (t) => t.category === 'facility' },
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

const DOMAIN_ORDER: TemplateCategory[] = ['network', 'server', 'middleware', 'ai', 'ops', 'facility'];

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

export function countByCategory(list: Template[], filter: (t: Template) => boolean): number {
  return list.filter(filter).length;
}

export function countByActivity(list: Template[], id: TemplateActivity | 'all'): number {
  return id === 'all' ? list.length : list.filter((t) => activityOf(t) === id).length;
}

function CatIcon({ name, size, color }: { name: string; size: number; color?: string }) {
  return <Icon name={name} size={size} color={color} />;
}

const CATEGORY_ICON: Record<TemplateCategory, string> = {
  network: 'router',
  server: 'server',
  middleware: 'ethernet-port',
  ai: 'terminal',
  ops: 'config-file',
  facility: 'server',
};

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
          <CatIcon name={CATEGORY_ICON[tpl.category]} size={18} color="var(--cg-red)" />
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
  const [cat, setCat] = React.useState<string>('all');
  const [act, setAct] = React.useState<TemplateActivity | 'all'>('all');
  const all = CGTemplates;
  const activeRail = RAIL.find((r) => r.id === cat) ?? RAIL.find((r) => r.id === 'all')!;
  const byCat = all.filter(activeRail.filter);
  const list = act === 'all' ? byCat : byCat.filter((t) => activityOf(t) === act);
  const groups = groupBySubCategory(list);
  // Both rails count within the OTHER axis's current selection, so each number
  // matches what the grid shows: category counts respect the active activity,
  // activity counts respect the active category.
  const byAct = act === 'all' ? all : all.filter((t) => activityOf(t) === act);
  const count = (entry: RailEntry) => countByCategory(byAct, entry.filter);
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
        <nav style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--cg-border)', background: 'var(--cg-bg-secondary)', padding: 'var(--space-4)', overflowY: 'auto' }}>
          <div style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--cg-text-faint)', fontWeight: 700, padding: '4px 8px 10px' }}>カテゴリ</div>
          {RAIL.map((entry, i) => {
            const on = entry.id === cat;
            const showGroupHeading = entry.group !== undefined && entry.group !== RAIL[i - 1]?.group;
            return (
              <React.Fragment key={entry.id}>
                {showGroupHeading && (
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      color: 'var(--cg-text-faint)',
                      fontWeight: 700,
                      padding: '10px 9px 2px',
                    }}
                  >
                    {entry.group}
                  </div>
                )}
                <button
                  onClick={() => { setCat(entry.id); setAct('all'); }}
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
                  <CatIcon name={entry.icon} size={16} color={on ? 'var(--cg-red)' : 'var(--cg-text-muted)'} />
                  <span style={{ flex: 1 }}>{entry.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--cg-text-faint)', fontFamily: 'var(--font-mono)' }}>{count(entry)}</span>
                </button>
              </React.Fragment>
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
