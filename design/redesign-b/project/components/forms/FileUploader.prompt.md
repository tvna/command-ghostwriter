The dropzone for config (toml/yaml/csv) and Jinja template files — the core input of Command Ghostwriter.

```jsx
<FileUploader label="設定定義ファイルをアップロード" accept="TOML, YAML, CSV"
  fileName="cisco_config.toml" fileSize="889 B" />
```

Pass `fileName` + `fileSize` to show the uploaded-file row. Always wrap in a `<Card>` to match the app layout.
