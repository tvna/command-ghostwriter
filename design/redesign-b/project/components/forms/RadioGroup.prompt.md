Single-choice radio set — e.g. download file extension (txt / md).

```jsx
<RadioGroup label="ダウンロード時のファイル拡張子" value={ext}
  options={['txt', 'md']} horizontal onChange={setExt} />
```

Pass `horizontal` for inline layout. Selected option shows a red filled dot.
