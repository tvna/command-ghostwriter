# Command Ghostwriter — UI Kit

An interactive, high-fidelity recreation of the **Command Ghostwriter** Streamlit
app (`app.py`). It composes the design-system primitives — no UI is re-implemented
here.

## Run
Open `index.html`. The bundle (`_ds_bundle.js`) and `styles.css` load from the
project root; component primitives come off `window.CommandGhostwriterDesignSystem_0d5f31`.

## Screens (tabs)
| File | Tab | What it shows |
|---|---|---|
| `GenerateTab.jsx` | 📝 コマンド生成 | Upload config + Jinja template → generate CLI commands / Markdown, download. |
| `DebugTab.jsx` | 📜 設定デバッグ | Parse a config file and inspect it as visual JSON / TOML / YAML. |
| `SettingsTab.jsx` | ⚙️ 詳細設定 | Input & output options: NaN fill, strict-undefined, transcoding, format, encoding, filename, extension. |
| `SamplesTab.jsx` | 💼 サンプル集 | Read-only gallery of the bundled example files. |
| `WorkflowTab.jsx` | 🔀 ワークフロー | The senior→junior templatize-then-generate flow. |
| `Sidebar.jsx` | — | Streamlit sidebar: welcome blurb + syntax-doc expander. |
| `App.jsx` | — | Shell: title, tab strip, routing. |

## Interactions
- Switch tabs (red underline marks the active one).
- On コマンド生成, click **CLIコマンド生成** or **Markdown生成** to populate the output well; **ダウンロード** enables once output exists.
- On 設定デバッグ, pick visual / toml / yaml to render the parsed config.
- All toggles, selects, radios, and inputs on 詳細設定 are live.

## Fidelity notes
Sample data is drawn from the repo's real `assets/examples/` (Cisco switch config,
DNS dig CSV, success YAML). The generated CLI output is a representative render of a
Jinja template applied to `cisco_config.toml` — illustrative, not a live Jinja engine.
