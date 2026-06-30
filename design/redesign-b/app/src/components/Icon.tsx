import React from 'react';

// Icon — inlines a brand SVG icon from assets/icons so it inherits `color`
// (the SVGs use stroke="currentColor"). Use for infra + UI glyphs.
//
// The prototype fetched each SVG at runtime; here we bundle them eagerly as raw
// strings via Vite's glob import, so icons render synchronously and work offline.
const RAW = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(RAW).map(([path, svg]) => {
    const name = path.split('/').pop()!.replace('.svg', '');
    return [name, svg];
  }),
);

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, color, style }: IconProps) {
  const raw = ICONS[name] || '';
  // Force the rendered svg to the requested pixel size (sources carry only a viewBox).
  const html = raw.replace(/<svg/, `<svg width="${size}" height="${size}"`);
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-grid', placeItems: 'center', width: size, height: size, color, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
