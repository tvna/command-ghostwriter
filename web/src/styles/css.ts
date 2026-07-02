import type { CSSProperties } from 'react';

// React.CSSProperties doesn't permit CSS custom properties (`--foo`). This loose
// alias lets components set design-token-style vars inline (e.g. `--cg-o`).
export type Style = CSSProperties & Record<`--${string}`, string | number>;
