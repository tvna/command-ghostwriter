Dropdown select — output format, download encoding, and other single-choice settings.

```jsx
<Selectbox label="ダウンロードファイルの文字コード" value={enc}
  options={['Shift_JIS', 'utf-8']} onChange={setEnc} />
```

Controlled via `value` + `onChange`. The open menu marks the current value in red.
