import React from 'react';
import { Toggle, TextInput, Selectbox, RadioGroup, Button } from '../ds';
import { Icon } from './Icon';

// SettingsModal — the 詳細設定 panel, moved off the main canvas into an overlay
// dialog (replaces the old standalone tab). Composes DS form controls.

const FMT_OPTIONS = [
  '3: 半角スペースと余分な改行を一部削除',
  '0: フォーマット指定無し',
  '1: 半角スペースを一部削除',
  '2: 余分な改行を一部削除',
  '4: 半角スペースの一部と余分な改行を全て削除',
];

function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>{children}</div>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{ margin: '0 0 2px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--cg-text)' }}>
      {children}
    </h4>
  );
}

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [nan, setNan] = React.useState(true);
  const [nanWith, setNanWith] = React.useState('#');
  const [strict, setStrict] = React.useState(true);
  const [auto, setAuto] = React.useState(true);
  const [rows, setRows] = React.useState('csv_rows');
  const [fmt, setFmt] = React.useState(FMT_OPTIONS[0]);
  const [enc, setEnc] = React.useState('UTF-8');
  const [fname, setFname] = React.useState('command');
  const [ts, setTs] = React.useState(true);
  const [ext, setExt] = React.useState('txt');
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,.55)',
        backdropFilter: 'blur(2px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 620,
          maxHeight: '86vh',
          overflow: 'auto',
          background: 'var(--cg-bg)',
          border: '1px solid var(--cg-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--cg-border)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--cg-text)', whiteSpace: 'nowrap' }}>
            <Icon name="settings" size={18} />詳細設定
          </span>
          <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--cg-text-muted)', fontSize: 22, lineHeight: 1 }}>×</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <Sub>入力ファイル</Sub>
            <Field><TextInput label="CSVのforループ対象の変数名" value={rows} onChange={setRows} /></Field>
            <Field>
              <Toggle checked={nan} label="CSVの欠損値(NaN)を指定文字として扱う" onChange={setNan} />
              <TextInput label="欠損値(NaN)の変換後の文字" value={nanWith} onChange={setNanWith} />
            </Field>
            <Field><Toggle checked={strict} label="テンプレートの変数チェック厳格化" onChange={setStrict} /></Field>
            <Field><Toggle checked={auto} label="UTF-8以外の文字コードを自動判定" onChange={setAuto} /></Field>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <Sub>出力ファイル</Sub>
            <Field><Selectbox label="出力フォーマット" value={fmt} options={FMT_OPTIONS} onChange={setFmt} /></Field>
            <Field><Selectbox label="ダウンロードの文字コード" value={enc} options={['UTF-8', 'Shift_JIS']} onChange={setEnc} /></Field>
            <Field><TextInput label="ダウンロード時のファイル名" value={fname} onChange={setFname} /></Field>
            <Field><Toggle checked={ts} label="ファイル名にタイムスタンプを付与" onChange={setTs} /></Field>
            <Field><RadioGroup label="ファイル拡張子" value={ext} options={['txt', 'md']} horizontal onChange={setExt} /></Field>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', padding: '14px 20px', borderTop: '1px solid var(--cg-border)' }}>
          <Button variant="ghost" onClick={onClose}>閉じる</Button>
          <Button variant="primary" onClick={onClose}>適用</Button>
        </div>
      </div>
    </div>
  );
}
