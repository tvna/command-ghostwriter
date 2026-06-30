# Command Ghostwriter — Design System

A design system for **Command ghostwriter** 👻 — a Streamlit web app that helps
infrastructure & network engineers turn repetitive CLI work into two reusable
files (a config-definition file in TOML/YAML/CSV + a Jinja template) and generate
ready-to-run commands or Markdown runbooks from them.

Because the product is built on **Streamlit**, this system codifies Streamlit's
design language — dark theme, the signature red `#FF4B4B`, Source Sans 3 + Source
Code Pro, rainbow subheader dividers, emoji-labelled tabs — as applied to a
network-ops tool, plus the app's own ghost mascot and Japanese-first voice.

## Sources
- **GitHub:** https://github.com/tvna/command-ghostwriter — the Streamlit app
  (`app.py`, `i18n.py`, `.streamlit/config.toml`, `assets/`). Explore it to design
  more faithfully against the real product.
- Live app referenced in repo: https://command-ghostwriter.streamlit.app/
- Framework: https://streamlit.io (the visual foundation this brand inherits).

---

## Content fundamentals

The product UI and docs are **Japanese-first** (a `日本語` language pack is the only
one shipped, in `i18n.py`).

- **Politeness / register:** polite form (です・ます). Instructions are direct and
  imperative-polite: 「各ファイルをアップロードし、『CLIコマンド生成』をクリックして
  結果を確認してください。」
- **Person:** addresses the user (利用者) as "you"; the system describes its own
  actions plainly ("生成します", "失敗"). No first person.
- **Casing & terms:** technical terms stay in their native form — `CLIコマンド`,
  `Jinjaテンプレート`, `TOML/YAML/CSV`, `Markdown`, `VLAN`. The product name is
  written lowercase **“Command ghostwriter”** and almost always followed by the
  ghost emoji 👻.
- **Status copy is terse:** success 「CLIコマンド生成に成功」, error
  「設定定義ファイルの読み込みに失敗」, warning 「必要な全ファイルが揃っていません」.
  Short noun-phrase + outcome, no apologies, no exclamation points.
- **Structure:** procedures are **numbered**; file formats are shown as fenced code
  examples. Documentation leans on tables, mermaid diagrams, and copy-pasteable
  snippets.
- **Emoji:** used deliberately as wayfinding, not decoration — one emoji per tab /
  section header (📝 📜 ⚙️ 💼 🔀) and the 👻 mascot. Never inside body copy.
- **Vibe:** competent, efficient, engineer-to-engineer. The "ghostwriter" conceit
  (a ghost that writes your commands for you) is the only playful note.

---

## Visual foundations

**Theme.** Dark is the default (`.streamlit/config.toml → base = "dark"`). App
background `#0E1117`; raised surfaces (sidebar, inputs, cards) `#262730`; sunken
code wells `#1A1C24`. A `.cg-light` scope flips surfaces to Streamlit's white base
while keeping the brand red.

**Color.** One dominant accent: **Streamlit red `#FF4B4B`** — primary buttons,
focus rings, active tab underline, radio/toggle selection, selection highlight.
Semantic states use Streamlit's alert palette: success `#21C354`, warning `#FFBD45`,
error `#FF4B4B`, info `#5AB9F0`, each as a 12%-tint fill with a 30% border and a
left accent stripe. The **rainbow gradient** (red→orange→yellow→green→blue→purple)
appears only as the 2px rule under section subheaders (`st.subheader(divider=
"rainbow")`). Mascot accents — pale-blue ghost outline `#AEC7D6`, pencil green
`#2E8B57`, desk wood `#D2A24C` — are reserved for brand surfaces.

**Type.** `Source Sans 3` (a.k.a. Source Sans Pro) for all UI and body; `Source
Code Pro` for CLI output, config files, and inline code — mono is heavily used
because the artifacts *are* code. Scale runs 11px→36px; page title (`st.title`) is
36/700, section headings 24/700, subheaders 20/600, body 16/400, help text & meta
14/400 in muted gray.

**Spacing & layout.** 4px base rhythm; controls sit 16px apart; containers pad 16px;
page gutters ~48px. Fixed left sidebar (~21rem). Content is built from **bordered
containers** (`st.container(border=True)`) laid out in 1–3 equal columns. Buttons in
an action row stretch full-width (`use_container_width`).

**Corners & borders.** Soft `0.5rem` (8px) radius on buttons, inputs, and cards;
`4px` on small chips; pills (999px) for badges and the rainbow rule. Borders are a
single `1px` hairline `#3A3C49`; file dropzones use a **dashed** border that turns
red on hover.

**Elevation.** Mostly flat. Shadows are subtle and dark (`0 2px 8px rgba(0,0,0,.36)`)
and reserved for menus/popovers. The one assertive elevation cue is the **red focus
ring** `0 0 0 3px rgba(255,75,75,.4)`.

**Backgrounds.** Flat solid fills only — no gradients (except the rainbow rule),
no imagery, no texture. The mascot (a flat illustration) is the sole picture.

**Motion.** Restrained: 160ms standard transitions on hover/focus color and the
toggle knob slide. No bounces, no entrance animations, no decorative loops.
`cubic-bezier(.4,0,.2,1)` easing.

**Hover / press.** Hover lightens the red (`#FF6C6C`) or reveals a red border/text
on secondary controls; press deepens to `#FF2B2B`. Disabled drops to 45% opacity.
Transparency/blur are essentially unused — surfaces are opaque.

---

## Iconography

The system ships a **purpose-built SVG icon system** plus the original product's
emoji heritage.

**Brand mark** — `assets/brand/logo-mark.svg`. A geometric ghost whose face is a
terminal prompt `>_` (ghost + ghostwriter + CLI), in brand red `#FF4B4B`. It works
directly on dark surfaces, scales from favicon to hero, and replaces the old
illustration in the redesign. Pair with the lowercase "Command ghostwriter" wordmark.

**Infra icon set** — `assets/icons/*.svg`. 24×24, `fill:none`, `stroke:currentColor`,
1.8 stroke, round caps/joins — so any glyph tints to `--cg-text`, `--cg-red`, etc. by
setting `color`. The set leans into the network/infra domain this tool serves:

| Icon | Use | Icon | Use |
|---|---|---|---|
| `server` | rack server | `config-file` | TOML/YAML/CSV data (doc + sliders) |
| `router` | router (antennas) | `template-file` | Jinja template (doc + `{{ }}`) |
| `switch` | network switch (ports) | `terminal` | CLI / `>_` prompt |
| `ethernet-port` | RJ45 port | `generate` | run / bolt |
| `topology` | network graph | `settings` `copy` `download` `upload-cloud` | UI affordances |
| `ghost` | line-art mascot | | |

- **Usage in code:** inline the SVG so it inherits `color` (e.g. the redesign's
  `redesign/Icon.jsx` fetches + injects). Do **not** load via `<img>` if you need to
  tint — `currentColor` won't resolve. For static cards, CSS `mask` or inline both work.
- **Emoji heritage:** the *original* product (recreated faithfully in
  `ui_kits/command-ghostwriter/`) used native emoji as tab labels (📝 📜 ⚙️ 💼 🔀) and
  the 👻 mascot. That recreation keeps them for accuracy. New/redesigned surfaces use
  the SVG set above. Drifting 👻 also appears as atmospheric "spectres" in the
  redesigned empty state.
- **Deprecated:** `assets/icon.png` / `assets/icon.ico` (the いらすとや illustration)
  is retained **only** to document the original product in the UI-kit recreation. New
  work should use `logo-mark.svg`.
- **Workflow diagram:** `assets/images/workflow_sequence_diagram_jp.svg` — a mermaid
  render of the templatize→generate flow (reference; the UI kit rebuilds it live).

See the **Brand → Iconography** card (`guidelines/icon-set.html`) for the full sheet.

---

## Index / manifest

**Root**
- `styles.css` — global entry point (import manifest only). Consumers link this.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`.
- `assets/` — `icon.png`, `icon.ico`, `images/workflow_sequence_diagram_jp.svg`.
- `SKILL.md` — Agent-Skills-compatible entry for downloading/using this system.

**Components** (`components/`, exported on `window.CommandGhostwriterDesignSystem_0d5f31`)
- `core/` — `Button`, `Badge`, `Card`, `Divider`
- `forms/` — `FileUploader`, `Toggle`, `TextInput`, `Selectbox`, `RadioGroup`, `TextArea`
- `feedback/` — `Alert`, `CodeBlock`
- `navigation/` — `Tabs`

**Foundation cards** (`guidelines/`) — Colors, Type, Spacing, Brand specimen cards
shown in the Design System tab.

**UI kit** (`ui_kits/command-ghostwriter/`) — interactive recreation of the full
5-tab app. See its `README.md`.

> The compiler discovers everything from file content + sibling relationships, not
> folder names. Do not hand-edit `_ds_bundle.js`, `_ds_manifest.json`, or
> `_adherence.oxlintrc.json` — they are generated.

---

## Substitutions & caveats
- **Fonts** load from Google Fonts (`Source Sans 3`, `Source Code Pro`) — the same
  families Streamlit ships. Swap the `@font-face`/`@import` in `tokens/fonts.css`
  for self-hosted woff2 if you need offline/pinned binaries.
- The mascot is a third-party いらすとや illustration carried over from the repo;
  confirm its license before using it in production marketing.
