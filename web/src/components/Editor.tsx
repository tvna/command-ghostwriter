import React from 'react';
import type { ReactNode } from 'react';
import { Button, Badge, Selectbox } from '../ds';
import { CodeView } from './CodeView';
import { SettingsModal } from './SettingsModal';
import type { DownloadOptions } from './SettingsModal';
import { HowToModal } from './HowToModal';
import { Icon } from './Icon';
import { CG } from '../lib/data';
import type { Format } from '../lib/format';
import type { GenerateSettings } from '../worker/types';
import type { Template } from '../lib/types';
import { useGenerate } from '../useGenerate';
import type { GenError } from '../useGenerate';
import { triggerDownload, downloadFilename } from '../download';
import type { DownloadEncoding } from '../download';
import logoMark from '../assets/brand/logo-mark.svg';

/* ---- small building blocks ---- */
interface SegItem {
  id: string;
  icon?: ReactNode;
  label: string;
}
function Segmented({ items, value, onChange }: { items: SegItem[]; value: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--cg-bg)', border: '1px solid var(--cg-border)', borderRadius: 'var(--radius-md)', padding: 3, gap: 3 }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: on ? 600 : 400,
              color: on ? '#fff' : 'var(--cg-text-muted)',
              background: on ? 'var(--cg-red)' : 'transparent',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 12px',
              transition: 'background var(--dur-base)',
              whiteSpace: 'nowrap',
            }}
          >
            {it.icon && <span>{it.icon}</span>}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function PaneHeader({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '10px 14px', borderBottom: '1px solid var(--cg-border)', background: 'var(--cg-bg-secondary)', minHeight: 30 }}>
      {children}
    </div>
  );
}

function StatusBar({ children, tone }: { children: ReactNode; tone?: 'ok' | 'err' }) {
  const c = tone === 'ok' ? 'var(--cg-success)' : tone === 'err' ? 'var(--cg-red-tint)' : 'var(--cg-text-muted)';
  const bg = tone === 'err' ? 'var(--cg-error-bg)' : 'var(--cg-bg-secondary)';
  const bd = tone === 'err' ? 'var(--cg-error-border)' : 'var(--cg-border)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '7px 14px', borderTop: `1px solid ${bd}`, background: bg, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: c }}>
      {children}
    </div>
  );
}

/* ---- main ---- */
export interface EditorProps {
  initial?: Template | null;
  onBack?: () => void;
  settings: GenerateSettings;
  onSettings: (s: GenerateSettings) => void;
  download: DownloadOptions;
  onDownload: (d: DownloadOptions) => void;
}

function initialFormat(tpl: Template | null): Format {
  return (tpl && tpl.format) || 'toml';
}
function initialData(tpl: Template | null): string {
  return (tpl && tpl.data) || CG.configToml;
}
function initialTemplate(tpl: Template | null): string {
  return (tpl && tpl.template) || CG.templateJ2;
}
function computeDataErrLine(r: GenResult): number {
  return r.error && r.error.pane !== 'tpl' ? r.error.line || 0 : 0;
}

export function Editor({ initial, onBack, settings, onSettings, download, onDownload }: EditorProps) {
  const tpl = initial || null;
  const [leftTab, setLeftTab] = React.useState<'data' | 'tpl'>('data');
  const [format, setFormat] = React.useState<Format>(initialFormat(tpl));
  const [rightMode, setRightMode] = React.useState<'md' | 'raw' | 'debug'>('md');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [howto, setHowto] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // live, editable input
  const [dataText, setDataText] = React.useState(initialData(tpl));
  const [tplText, setTplText] = React.useState(initialTemplate(tpl));

  const toastTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const fire = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  // recompute output / variables / validation from the actual input on every edit
  const r = useGenerate(dataText, format, tplText, settings);
  const blocked = !r.ok;
  const dataErrLine = computeDataErrLine(r);
  const enc = download.enc;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 620, minWidth: 1024, background: 'var(--cg-bg)', fontFamily: 'var(--font-sans)', color: 'var(--cg-text)' }}>

      {/* ===== App bar ===== */}
      <AppBar tpl={tpl} blocked={blocked} onBack={onBack} onHowto={() => setHowto(true)} onSettings={() => setSettingsOpen(true)} />

      {/* ===== Workspace ===== */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 7px 1fr', gridTemplateRows: 'minmax(0, 1fr)', minHeight: 0 }}>

        {/* ---- LEFT: input ---- */}
        <LeftPane
          leftTab={leftTab}
          setLeftTab={setLeftTab}
          format={format}
          setFormat={setFormat}
          dataText={dataText}
          setDataText={setDataText}
          tplText={tplText}
          setTplText={setTplText}
          dataErrLine={dataErrLine}
          blocked={blocked}
          r={r}
        />

        {/* resizer */}
        <div style={{ background: 'var(--cg-border)', cursor: 'col-resize', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 3, height: 28, borderRadius: 2, background: 'var(--cg-border-strong)' }} />
        </div>

        {/* ---- RIGHT: output / debug ---- */}
        <RightPane
          rightMode={rightMode}
          setRightMode={setRightMode}
          format={format}
          setFormat={setFormat}
          enc={enc}
          download={download}
          onDownload={onDownload}
          blocked={blocked}
          r={r}
          fire={fire}
        />
      </div>

      {/* toast */}
      <Toast toast={toast} />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSettings={onSettings} download={download} onDownload={onDownload} />
      <HowToModal open={howto} onClose={() => setHowto(false)} />
    </div>
  );
}

function Toast({ toast }: { toast: string | null }) {
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', background: 'var(--cg-bg-secondary)', border: '1px solid var(--cg-success-border)', color: 'var(--cg-text)', borderRadius: 'var(--radius-pill)', padding: '9px 18px', fontSize: 'var(--text-sm)', boxShadow: 'var(--shadow-lg)', zIndex: 1100, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--cg-success)', fontWeight: 800 }}>✓</span>{toast}
    </div>
  );
}

const FORMATS: SegItem[] = [
  { id: 'toml', label: 'TOML' },
  { id: 'yaml', label: 'YAML' },
  { id: 'csv', label: 'CSV' },
];

type GenResult = ReturnType<typeof useGenerate>;

function AppBar({ tpl, blocked, onBack, onHowto, onSettings }: { tpl: Template | null; blocked: boolean; onBack?: () => void; onHowto: () => void; onSettings: () => void }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '0 18px', height: 56, borderBottom: '1px solid var(--cg-border)', flexShrink: 0 }}>
      {onBack && (
        <button onClick={onBack} title="戻る" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flexShrink: 0, cursor: 'pointer', background: 'transparent', border: '1px solid var(--cg-border)', borderRadius: 'var(--radius-md)', color: 'var(--cg-text-muted)', fontSize: 16, lineHeight: 1 }}>←</button>
      )}
      <img src={logoMark} alt="" style={{ width: 30, height: 30, flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', whiteSpace: 'nowrap' }}>Command ghostwriter</span>
      </div>
      <div style={{ width: 1, height: 22, background: 'var(--cg-border)', margin: '0 4px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cg-text-muted)', fontSize: 'var(--text-sm)' }}>
        <span style={{ color: 'var(--cg-text)' }}>{tpl ? tpl.id : '無題のドキュメント'}</span>
        <Badge tone="success">{tpl ? '保存済み' : '新規'}</Badge>
      </div>
      <div style={{ flex: 1 }} />
      {blocked && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--cg-red-tint)', fontFamily: 'var(--font-mono)' }}>
          <Icon name="terminal" size={14} color="var(--cg-red)" />1 error
        </span>
      )}
      <Button variant="ghost" size="sm" icon={<Icon name="template-file" size={15} />} onClick={onHowto}>使い方</Button>
      <Button variant="ghost" size="sm" icon={<Icon name="settings" size={15} />} onClick={onSettings}>詳細設定</Button>
    </header>
  );
}

function DataErrorPanel({ error, suggest, setFormat }: { error: GenError; suggest: Format | null; setFormat: (f: Format) => void }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 14px', borderTop: '1px solid var(--cg-error-border)', background: 'var(--cg-error-bg)' }}>
      <Icon name="terminal" size={16} color="var(--cg-red)" style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--cg-red-tint)' }}>
          {error.title}
          {error.line ? ' · ' + error.line + '行目' : ''}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cg-text-muted)', marginTop: 3, lineHeight: 1.5 }}>
          {error.detail}
        </div>
        {suggest && (
          <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
            <button onClick={() => setFormat(suggest)} style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 600, color: '#fff', background: 'var(--cg-red)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '5px 11px', cursor: 'pointer' }}>
              {suggest.toUpperCase()} として読み込む
            </button>
            <button onClick={() => setFormat(suggest)} style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--cg-text-muted)', background: 'transparent', border: '1px solid var(--cg-border-strong)', borderRadius: 'var(--radius-sm)', padding: '5px 11px', cursor: 'pointer' }}>
              自動判定で修正
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VarsBar({ r }: { r: GenResult }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '8px 14px', borderTop: '1px solid var(--cg-border)', background: 'var(--cg-bg-secondary)' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--cg-text-faint)', marginRight: 2 }}>検出した変数</span>
      {r.vars.length ? (
        r.vars.map((v) => (
          <Badge key={v} tone={r.error && r.error.varName === v ? 'error' : 'brand'}>{v}</Badge>
        ))
      ) : (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--cg-text-faint)' }}>—</span>
      )}
    </div>
  );
}

function LeftStatusBar({ leftTab, blocked, format, r }: { leftTab: 'data' | 'tpl'; blocked: boolean; format: Format; r: GenResult }) {
  const dataBlocked = leftTab === 'data' && blocked;
  return (
    <StatusBar tone={dataBlocked ? 'err' : 'ok'}>
      {dataBlocked ? (
        <>
          <span style={{ color: 'var(--cg-red)' }}>✕</span>
          <span style={{ color: 'var(--cg-red-tint)' }}>解析失敗 · {format.toUpperCase()} · 1 error</span>
        </>
      ) : (
        <>
          <span>✓</span>
          {leftTab === 'data' ? (
            <span>パース成功 · {format.toUpperCase()} · {r.interfaces} interfaces</span>
          ) : (
            <span>テンプレート構文OK · 変数 {r.vars.length} 件</span>
          )}
        </>
      )}
    </StatusBar>
  );
}

interface LeftPaneProps {
  leftTab: 'data' | 'tpl';
  setLeftTab: (t: 'data' | 'tpl') => void;
  format: Format;
  setFormat: (f: Format) => void;
  dataText: string;
  setDataText: (s: string) => void;
  tplText: string;
  setTplText: (s: string) => void;
  dataErrLine: number;
  blocked: boolean;
  r: GenResult;
}

function LeftPane({ leftTab, setLeftTab, format, setFormat, dataText, setDataText, tplText, setTplText, dataErrLine, blocked, r }: LeftPaneProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
      <PaneHeader>
        <Segmented
          value={leftTab}
          onChange={(id) => setLeftTab(id as 'data' | 'tpl')}
          items={[
            { id: 'data', icon: <Icon name="config-file" size={15} />, label: 'データ定義' },
            { id: 'tpl', icon: <Icon name="template-file" size={15} />, label: 'テンプレート' },
          ]}
        />
        <div style={{ flex: 1 }} />
        {leftTab === 'data' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--cg-text-faint)', whiteSpace: 'nowrap' }}>形式</span>
            <Segmented value={format} onChange={(id) => setFormat(id as Format)} items={FORMATS} />
          </div>
        )}
      </PaneHeader>

      <div style={{ flex: 1, minHeight: 0 }}>
        {leftTab === 'data' ? (
          <CodeView code={dataText} lang="toml" errorLine={dataErrLine} onChange={setDataText} />
        ) : (
          <CodeView code={tplText} lang="jinja" errorLine={r.error && r.error.pane === 'tpl' ? r.error.line || 0 : 0} onChange={setTplText} />
        )}
      </div>

      {leftTab === 'data' && blocked && r.error && (
        <DataErrorPanel error={r.error} suggest={r.suggest} setFormat={setFormat} />
      )}

      {leftTab === 'tpl' && <VarsBar r={r} />}

      <LeftStatusBar leftTab={leftTab} blocked={blocked} format={format} r={r} />
    </section>
  );
}

function OutputActions({ enc, download, onDownload, blocked, r, fire }: { enc: DownloadOptions['enc']; download: DownloadOptions; onDownload: (d: DownloadOptions) => void; blocked: boolean; r: GenResult; fire: (msg: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Selectbox value={enc} options={['UTF-8', 'Shift_JIS']} onChange={(v) => onDownload({ ...download, enc: v as DownloadOptions['enc'] })} style={{ width: 152 }} />
      <Button variant="secondary" size="sm" disabled={blocked} icon={<Icon name="copy" size={14} />} onClick={() => { void navigator.clipboard.writeText(r.output); fire('コピーしました'); }}>コピー</Button>
      <Button variant="primary" size="sm" disabled={blocked} icon={<Icon name="download" size={14} />} onClick={() => {
        const e: DownloadEncoding = enc === 'Shift_JIS' ? 'Shift_JIS' : 'utf-8';
        triggerDownload(r.output, downloadFilename(download.fname, download.ext, download.ts), e);
        fire('ダウンロードを開始');
      }}>保存</Button>
    </div>
  );
}

function OutputBody({ rightMode, format, setFormat, blocked, r }: { rightMode: 'md' | 'raw' | 'debug'; format: Format; setFormat: (f: Format) => void; blocked: boolean; r: GenResult }) {
  if (blocked) {
    return <BlockedOutput format={format} error={r.error} suggest={r.suggest} onFix={() => r.suggest && setFormat(r.suggest)} />;
  }
  return (
    <>
      {rightMode === 'raw' && <CodeView code={r.output} lang="markdown" readOnly />}
      {rightMode === 'debug' && <CodeView code={r.json} lang="json" readOnly />}
      {rightMode === 'md' && <MarkdownView output={r.output} />}
    </>
  );
}

function RightStatusBar({ rightMode, enc, blocked, r }: { rightMode: 'md' | 'raw' | 'debug'; enc: DownloadOptions['enc']; blocked: boolean; r: GenResult }) {
  return (
    <StatusBar tone={blocked ? 'err' : 'ok'}>
      {blocked ? (
        <>
          <span style={{ color: 'var(--cg-red)' }}>✕</span>
          <span style={{ color: 'var(--cg-red-tint)' }}>入力エラーのため生成できません</span>
        </>
      ) : (
        <>
          <span>✓</span>
          {rightMode === 'raw' && <span>生成成功 · {r.output.replace(/\n+$/, '').split('\n').length} 行 · raw</span>}
          {rightMode === 'md' && <span>手順書を生成 · {enc}</span>}
          {rightMode === 'debug' && <span>解析成功 · {r.keys} keys · {r.interfaces} interfaces</span>}
        </>
      )}
    </StatusBar>
  );
}

interface RightPaneProps {
  rightMode: 'md' | 'raw' | 'debug';
  setRightMode: (m: 'md' | 'raw' | 'debug') => void;
  format: Format;
  setFormat: (f: Format) => void;
  enc: DownloadOptions['enc'];
  download: DownloadOptions;
  onDownload: (d: DownloadOptions) => void;
  blocked: boolean;
  r: GenResult;
  fire: (msg: string) => void;
}

function RightPane({ rightMode, setRightMode, format, setFormat, enc, download, onDownload, blocked, r, fire }: RightPaneProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
      <PaneHeader>
        <Segmented
          value={rightMode}
          onChange={(id) => setRightMode(id as 'md' | 'raw' | 'debug')}
          items={[
            { id: 'md', label: '手順書' },
            { id: 'raw', label: 'Raw' },
            { id: 'debug', label: 'Visual Debug' },
          ]}
        />
        <div style={{ flex: 1 }} />
        {rightMode !== 'debug' && (
          <OutputActions enc={enc} download={download} onDownload={onDownload} blocked={blocked} r={r} fire={fire} />
        )}
      </PaneHeader>

      <div style={{ flex: 1, minHeight: 0 }}>
        <OutputBody rightMode={rightMode} format={format} setFormat={setFormat} blocked={blocked} r={r} />
      </div>

      <RightStatusBar rightMode={rightMode} enc={enc} blocked={blocked} r={r} />
    </section>
  );
}

function BlockedOutput({ format, error, suggest, onFix }: { format: Format; error: GenError | null; suggest: Format | null; onFix: () => void }) {
  const tplErr = error && error.pane === 'tpl';
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: 'var(--cg-bg-code)', padding: 32, textAlign: 'center' }}>
      <Icon name="terminal" size={40} color="var(--cg-border-strong)" />
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--cg-text)' }}>出力を生成できません</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--cg-text-muted)', maxWidth: 340, lineHeight: 1.6 }}>
        {tplErr ? (
          <>
            <b style={{ color: 'var(--cg-red-tint)' }}>{error!.title}</b>
            <br />
            {error!.detail}
          </>
        ) : (
          <>
            入力データを <b style={{ color: 'var(--cg-red-tint)' }}>{format.toUpperCase()}</b> として解析できませんでした。左ペインのエラーを解消すると、ここに結果が表示されます。
          </>
        )}
      </div>
      {suggest && (
        <button onClick={onFix} style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 600, color: '#fff', background: 'var(--cg-red)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px', cursor: 'pointer', marginTop: 4 }}>
          {suggest.toUpperCase()} として読み込む
        </button>
      )}
    </div>
  );
}

// Tiny Markdown renderer — headings, fenced code, ordered/unordered lists, **bold**, `code`.
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] != null) nodes.push(<b key={keyBase + '-' + i++} style={{ color: 'var(--cg-text)' }}>{m[1]}</b>);
    else
      nodes.push(
        <code key={keyBase + '-' + i++} style={{ fontFamily: 'var(--font-mono)', fontSize: '.92em', background: 'var(--cg-bg)', border: '1px solid var(--cg-border)', borderRadius: 4, padding: '1px 5px' }}>
          {m[2]}
        </code>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MarkdownView({ output }: { output: string }) {
  const lines = output.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={key++} style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.5, background: 'var(--cg-bg)', border: '1px solid var(--cg-border)', borderRadius: 'var(--radius-md)', padding: '10px 13px', margin: '0 0 14px', whiteSpace: 'pre', overflowX: 'auto', color: 'var(--cg-text)' }}>
          {buf.join('\n')}
        </pre>,
      );
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const sz = lvl === 1 ? 'var(--text-xl)' : lvl === 2 ? 'var(--text-lg)' : 'var(--text-base)';
      blocks.push(
        React.createElement(
          'h' + lvl,
          { key: key++, style: { fontSize: sz, fontWeight: 700, margin: lvl === 1 ? '0 0 10px' : '18px 0 8px', color: 'var(--cg-text)' } },
          renderInline(h[2], 'h' + key),
        ),
      );
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} style={{ margin: '0 0 14px', paddingLeft: 22, color: 'var(--cg-text)', fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, 'u' + key + j)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} style={{ margin: '0 0 14px', paddingLeft: 22, color: 'var(--cg-text)', fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
          {items.map((it, j) => (
            <li key={j}>{renderInline(it, 'o' + key + j)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    blocks.push(
      <p key={key++} style={{ margin: '0 0 12px', fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--cg-text-muted)' }}>
        {renderInline(line, 'p' + key)}
      </p>,
    );
    i++;
  }
  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--cg-bg-code)', padding: '24px 28px', fontFamily: 'var(--font-sans)' }}>
      {blocks.length ? blocks : <p style={{ color: 'var(--cg-text-faint)', fontSize: 'var(--text-sm)' }}>—</p>}
    </div>
  );
}
