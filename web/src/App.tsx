import React from "react";
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

  if (route.view === "editor")
    return (
      <Editor
        key={route.initial ? route.initial.id : "blank"}
        initial={route.initial}
        onBack={back}
        settings={settings}
        onSettings={setSettings}
        download={download}
        onDownload={setDownload}
      />
    );
  if (route.view === "library") return <Library onOpen={openEditor} onClose={back} />;
  return <EmptyState onStart={() => openEditor(null)} onLibrary={() => go("#/library")} />;
}
