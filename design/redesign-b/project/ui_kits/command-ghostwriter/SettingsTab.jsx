/* global React */
// Tab 3 — 詳細設定. Input / output file settings: NaN handling, strict
// undefined, transcoding, output format, encoding, filename, extension.
const { Card, Toggle, TextInput, Selectbox, RadioGroup } =
  window.CommandGhostwriterDesignSystem_0d5f31;

const FORMAT_OPTIONS = [
  '0: フォーマット指定無し',
  '1: 半角スペースを一部削除',
  '2: 余分な改行を一部削除',
  '3: 半角スペースと余分な改行を一部削除',
  '4: 半角スペースの一部と余分な改行を全て削除',
];

function Group({ children }) {
  return (
    <div style={{ border: '1px solid var(--cg-border)', borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)', display: 'flex', flexDirection: 'column',
                  gap: 'var(--space-3)' }}>
      {children}
    </div>
  );
}

function SettingsTab() {
  const [rows, setRows] = React.useState('csv_rows');
  const [fillNan, setFillNan] = React.useState(true);
  const [nanWith, setNanWith] = React.useState('#');
  const [strict, setStrict] = React.useState(true);
  const [auto, setAuto] = React.useState(true);
  const [fmt, setFmt] = React.useState(FORMAT_OPTIONS[3]);
  const [enc, setEnc] = React.useState('Shift_JIS');
  const [fname, setFname] = React.useState('command');
  const [ts, setTs] = React.useState(true);
  const [ext, setExt] = React.useState('txt');

  const heading = (t) => (
    <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-lg)', fontWeight: 600,
                 color: 'var(--cg-text)', margin: '0 0 var(--space-3)' }}>{t}</h3>
  );

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xl)', fontWeight: 700,
                   color: 'var(--cg-text)', margin: '0 0 var(--space-2)' }}>⚙️ 詳細設定</h2>
      <hr className="cg-rainbow-divider" style={{ margin: '0 0 var(--space-6)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Card>
          {heading('入力ファイルの設定')}
          <Group><TextInput label="CSVのforループ対象の変数名" value={rows} onChange={setRows} /></Group>
          <Group>
            <Toggle checked={fillNan} label="CSVの欠損値(NaN)を指定文字として扱う" onChange={setFillNan} />
            <TextInput label="欠損値(NaN)の変換後の文字" value={nanWith} onChange={setNanWith} />
          </Group>
          <Group><Toggle checked={strict} label="テンプレートの変数チェック厳格化" onChange={setStrict} /></Group>
          <Group><Toggle checked={auto} label="UTF-8以外の文字コードを自動判定して読み込む" onChange={setAuto} /></Group>
        </Card>

        <Card>
          {heading('出力ファイルの設定')}
          <Group>
            <Selectbox label="出力フォーマット" value={fmt} options={FORMAT_OPTIONS} onChange={setFmt} />
            <Selectbox label="ダウンロードファイルの文字コード" value={enc}
              options={['Shift_JIS', 'utf-8']} onChange={setEnc} />
          </Group>
          <Group>
            <TextInput label="ダウンロード時のファイル名" value={fname} onChange={setFname} />
            <Toggle checked={ts} label="ファイル名の末尾にタイムスタンプを付与" onChange={setTs} />
            <RadioGroup label="ダウンロード時のファイル拡張子" value={ext}
              options={['txt', 'md']} horizontal onChange={setExt} />
          </Group>
        </Card>
      </div>
    </div>
  );
}

window.SettingsTab = SettingsTab;
