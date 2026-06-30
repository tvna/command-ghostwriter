---
name: command-ghostwriter-design
description: Use this skill to generate well-branded interfaces and assets for Command Ghostwriter (a Streamlit-based CLI command generator for infrastructure engineers), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets
out and create static HTML files for the user to view. If working on production code,
you can copy assets and read the rules here to become an expert in designing with this
brand.

If the user invokes this skill without any other guidance, ask them what they want to
build or design, ask some questions, and act as an expert designer who outputs HTML
artifacts _or_ production code, depending on the need.

## What's here
- `readme.md` — brand context, content fundamentals, visual foundations, iconography, manifest.
- `styles.css` + `tokens/` — the CSS custom properties and `@font-face` rules. Link
  `styles.css` and design with the tokens (`--cg-red`, `--surface-app`, `--font-mono`, …).
- `components/` — React UI primitives (Button, FileUploader, Toggle, Tabs, Alert,
  CodeBlock, …) exported on `window.CommandGhostwriterDesignSystem_0d5f31`.
- `ui_kits/command-ghostwriter/` — a full interactive recreation of the app to copy from.
- `guidelines/` — foundation specimen cards.
- `assets/` — the ghost mascot (`icon.png`) and workflow diagram.

## Brand in one breath
Streamlit's dark design language for infra engineers: background `#0E1117`, one
accent — Streamlit red `#FF4B4B`, Source Sans 3 + Source Code Pro (mono carries the
CLI/config output), soft 8px corners, flat surfaces, a rainbow rule under subheaders,
emoji-labelled tabs (📝 📜 ⚙️ 💼 🔀), and the 👻 ghostwriter mascot. Japanese-first,
polite-but-terse copy.
