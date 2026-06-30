# Command Ghostwriter — Redesign B

A production-oriented **Vite + React + TypeScript** implementation of the
*Redesign B (2-pane editor)* design exported from Claude Design (see
`../project/redesign/index.html` for the original click-through prototype and
`../chats/` for the design conversation).

This is the desktop-only modernization of the Streamlit-era Command Ghostwriter,
built for the Vercel migration discussed in the handoff. Mobile is intentionally
out of scope.

## Run it

```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle into dist/
npm run preview  # serve the production build
```

## What's implemented

The full routed flow from the prototype, driven by hash-based routing so
browser back/forward and reload restore the exact screen:

| Route        | Screen                                                            |
| ------------ | ---------------------------------------------------------------- |
| `#/`         | **Empty state** — onboarding with the workplace-safe "haunting" backdrop (drifting infra glyphs, whispered `/etc` config fragments, dust motes, fog/vignette), the two-file concept diagram, and three entry points. |
| `#/library`  | **Template library** — category rail + card grid, 6 seed templates + 空から作成. |
| `#/new`      | **Editor**, blank (loads the Cisco sample).                      |
| `#/t/<id>`   | **Editor**, seeded with a library template.                     |

The **2-pane editor** is the core: a live, editable left pane (data definition /
Jinja template, with explicit TOML/YAML/CSV format selection) and a right pane
that recomputes on every keystroke — 手順書 (rendered Markdown) / Raw / Visual
Debug (JSON). Validation highlights the offending line, surfaces a specific
message, and suggests the format that actually parses (the original
implicit-format bug, fixed). Advanced options live in the 詳細設定 modal.

The live engine (`src/lib/engine.ts`) is a lightweight TOML / YAML / CSV parser
plus a Jinja-ish renderer (`{{ x }}`, `| join`, `{% for k,v in obj.items() %}`,
`{% if %}`, array-of-tables, `loop_index`, and `trim_blocks`/`lstrip_blocks`
whitespace control on by default).

## Layout

```
src/
  main.tsx            entry
  App.tsx             hash router (empty / library / editor)
  styles/
    index.css         imports DS tokens + app-shell rules + haunting keyframes
    tokens/           colors, typography, spacing, base, fonts (from the DS)
    css.ts            CSS-custom-property style helper type
  ds/                 design-system primitives (Button, Badge, Divider,
                      Selectbox, Toggle, TextInput, RadioGroup, FileUploader)
  components/         Icon, CodeView, SettingsModal, EmptyState, Library, Editor
  lib/                engine.ts, data.ts, templates.ts, types.ts
  assets/             logo-mark.svg + 14 infra/UI line icons (inlined via Vite)
```

## Notes & provenance

- Visuals are recreated from the design source, styled entirely through the
  design-system CSS custom properties (`--cg-*`) so the brand stays consistent.
- Fonts (Source Sans 3 / Source Code Pro) load from Google Fonts, matching the
  Streamlit stack. Swap `src/styles/tokens/fonts.css` for self-hosted woff2 if
  needed.
- Icons are bundled at build time as raw SVG strings (`import.meta.glob`) so they
  inherit `currentColor` and work offline — no runtime fetch.
- The original product repo: <https://github.com/tvna/command-ghostwriter>.
