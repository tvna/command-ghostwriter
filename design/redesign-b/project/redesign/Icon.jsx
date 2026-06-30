/* global React */
// Icon — inlines a brand SVG icon from assets/icons so it inherits `color`
// (the SVGs use stroke="currentColor"). Use for infra + UI glyphs.
function Icon({ name, size = 18, color, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    let alive = true;
    fetch('../assets/icons/' + name + '.svg')
      .then((r) => r.text())
      .then((t) => {
        if (!alive || !ref.current) return;
        ref.current.innerHTML = t;
        const svg = ref.current.querySelector('svg');
        if (svg) { svg.setAttribute('width', size); svg.setAttribute('height', size); }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [name, size]);
  return <span ref={ref} aria-hidden="true" style={{ display: 'inline-grid', placeItems: 'center',
                  width: size, height: size, color, ...style }} />;
}
window.Icon = Icon;
