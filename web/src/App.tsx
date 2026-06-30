import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { EmptyState } from "./components/EmptyState";
import { Library } from "./components/Library";
import { Editor } from "./components/Editor";
import { CGTemplates } from "./lib/templates";
import type { Template } from "./lib/types";
import type { DownloadOptions } from "./components/SettingsModal";
import { DEFAULT_SETTINGS, type GenerateSettings } from "./worker/types";

type Route = { view: "empty" | "library" | "editor"; initial: Template | null };

function routeFromHash(): Route {
  const h = (location.hash || "").replace(/^#\/?/, "");
  if (h === "library") return { view: "library", initial: null };
  if (h === "new") return { view: "editor", initial: null };
  const m = h.match(/^t\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const tpl = CGTemplates.find((t) => t.id === id) || null;
    return { view: "editor", initial: tpl };
  }
  return { view: "empty", initial: null };
}

// Map the current hash route to a Vercel Analytics (route, path) pair. This app
// navigates only via location.hash/hashchange, which never triggers the History
// API, so <Analytics>'s default auto-tracking would miss every in-app navigation.
// Passing changing route/path props makes it emit a pageview per navigation;
// `route` groups dynamic template ids so per-template paths don't explode.
function analyticsLocation(): { route: string; path: string } {
  const h = (location.hash || "").replace(/^#\/?/, "");
  if (h === "library") return { route: "/library", path: "/library" };
  if (h === "new") return { route: "/new", path: "/new" };
  const m = h.match(/^t\/(.+)$/);
  if (m) return { route: "/t/[id]", path: "/t/" + m[1] };
  return { route: "/", path: "/" };
}

const DEFAULT_DOWNLOAD: DownloadOptions = { enc: "UTF-8", fname: "command", ts: true, ext: "txt" };

export function App() {
  const [route, setRoute] = React.useState<Route>(routeFromHash);
  const [settings, setSettings] = React.useState<GenerateSettings>(DEFAULT_SETTINGS);
  const [download, setDownload] = React.useState<DownloadOptions>(DEFAULT_DOWNLOAD);

  React.useEffect(() => {
    const on = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (hash: string) => { location.hash = hash; };
  const back = () => history.back();
  const openEditor = (tpl: Template | null) => go(tpl ? "#/t/" + encodeURIComponent(tpl.id) : "#/new");

  const content =
    route.view === "editor" ? (
      <Editor
        key={route.initial ? route.initial.id : "blank"}
        initial={route.initial}
        onBack={back}
        settings={settings}
        onSettings={setSettings}
        download={download}
        onDownload={setDownload}
      />
    ) : route.view === "library" ? (
      <Library onOpen={openEditor} onClose={back} />
    ) : (
      <EmptyState onStart={() => openEditor(null)} onLibrary={() => go("#/library")} />
    );

  const analytics = analyticsLocation();
  return (
    <>
      {content}
      <Analytics route={analytics.route} path={analytics.path} />
    </>
  );
}
