import React from 'react';
import { Toggle, TextInput, Selectbox, RadioGroup, Button } from '../ds';
import { Icon } from './Icon';
import type { GenerateSettings } from '../worker/types';

// SettingsModal — the 詳細設定 panel, moved off the main canvas into an overlay
// dialog (replaces the old standalone tab). Composes DS form controls.
// Controlled component: all state lives in parent via settings/download props.

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

export interface DownloadOptions {
  enc: 'UTF-8' | 'Shift_JIS';
  fname: string;
  ts: boolean;
  ext: string;
}

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GenerateSettings;
  onSettings: (next: GenerateSettings) => void;
  download: DownloadOptions;
  onDownload: (next: DownloadOptions) => void;
}

export function SettingsModal({ open, onClose, settings, onSettings, download, onDownload }: SettingsModalProps) {
  if (!open) return null;
  const setS = (patch: Partial<GenerateSettings>) => onSettings({ ...settings, ...patch });
  const setD = (patch: Partial<DownloadOptions>) => onDownload({ ...download, ...patch });

  // Map formatType number → FMT_OPTIONS label (first char of each label is the format number)
  const fmtValue = FMT_OPTIONS.find((o) => o.startsWith(String(settings.formatType))) ?? FMT_OPTIONS[0];

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
            <Field>
              <TextInput
                label="CSVのforループ対象の変数名"
                value={settings.csvRowsName}
                onChange={(v) => setS({ csvRowsName: v })}
              />
            </Field>
            <Field>
              <Toggle
                checked={settings.enableFillNan}
                label="CSVの欠損値(NaN)を指定文字として扱う"
                onChange={(v) => setS({ enableFillNan: v })}
              />
              <TextInput
                label="欠損値(NaN)の変換後の文字"
                value={settings.fillNanWith}
                onChange={(v) => setS({ fillNanWith: v })}
              />
            </Field>
            <Field>
              <Toggle
                checked={settings.isStrictUndefined}
                label="テンプレートの変数チェック厳格化"
                onChange={(v) => setS({ isStrictUndefined: v })}
              />
            </Field>
            <Field>
              <Toggle
                checked={settings.enableAutoTranscoding}
                label="UTF-8以外の文字コードを自動判定"
                onChange={(v) => setS({ enableAutoTranscoding: v })}
              />
            </Field>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <Sub>出力ファイル</Sub>
            <Field>
              <Selectbox
                label="出力フォーマット"
                value={fmtValue}
                options={FMT_OPTIONS}
                onChange={(label) => setS({ formatType: Number(label[0]) })}
              />
            </Field>
            <Field>
              <Selectbox
                label="ダウンロードの文字コード"
                value={download.enc}
                options={['UTF-8', 'Shift_JIS']}
                onChange={(v) => setD({ enc: v as DownloadOptions['enc'] })}
              />
            </Field>
            <Field>
              <TextInput
                label="ダウンロード時のファイル名"
                value={download.fname}
                onChange={(v) => setD({ fname: v })}
              />
            </Field>
            <Field>
              <Toggle
                checked={download.ts}
                label="ファイル名にタイムスタンプを付与"
                onChange={(v) => setD({ ts: v })}
              />
            </Field>
            <Field>
              <RadioGroup
                label="ファイル拡張子"
                value={download.ext}
                options={['txt', 'md']}
                horizontal
                onChange={(v) => setD({ ext: v })}
              />
            </Field>
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
