import React from 'react';
import { EmptyState } from './components/EmptyState';
import { Library } from './components/Library';
import { Editor } from './components/Editor';
import { CGTemplates } from './lib/templates';
import type { Template } from './lib/types';

// ---- hash-based routing so back/forward + reload restore the screen ----
//   #/            → empty (start)
//   #/library     → template library
//   #/new         → editor, blank (sample)
//   #/t/<id>      → editor seeded with a template
type Route = { view: 'empty' | 'library' | 'editor'; initial: Template | null };

function routeFromHash(): Route {
  const h = (location.hash || '').replace(/^#\/?/, '');
  if (h === 'library') return { view: 'library', initial: null };
  if (h === 'new') return { view: 'editor', initial: null };
  const m = h.match(/^t\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const tpl = CGTemplates.find((t) => t.id === id) || null;
    return { view: 'editor', initial: tpl };
  }
  return { view: 'empty', initial: null };
}

export function App() {
  const [route, setRoute] = React.useState<Route>(routeFromHash);
  React.useEffect(() => {
    const on = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (hash: string) => {
    location.hash = hash; // pushes a history entry
  };
  const back = () => {
    history.back();
  };
  const openEditor = (tpl: Template | null) => go(tpl ? '#/t/' + encodeURIComponent(tpl.id) : '#/new');

  if (route.view === 'editor')
    return <Editor key={route.initial ? route.initial.id : 'blank'} initial={route.initial} onBack={back} />;
  if (route.view === 'library') return <Library onOpen={openEditor} onClose={back} />;
  return <EmptyState onStart={() => openEditor(null)} onLibrary={() => go('#/library')} />;
}
