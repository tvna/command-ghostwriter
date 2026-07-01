import React from "react";
import { Analytics } from "@vercel/analytics/react";
import Encoding from "encoding-japanese";
import { EmptyState } from "./components/EmptyState";
import { Library } from "./components/Library";
import { Editor } from "./components/Editor";
import { CGTemplates } from "./lib/templates";
import type { Template } from "./lib/types";
import { CG } from "./lib/data";
import type { Format } from "./lib/format";
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

function formatFromFileName(name: string): Format {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "yaml" || ext === "yml") return "yaml";
  if (ext === "csv") return "csv";
  return "toml";
}

function uploadedTemplate(file: File, content: string, kind: "config" | "template"): Template {
  const isConfig = kind === "config";
  return {
    id: `uploaded-${kind}`,
    name: file.name,
    desc: "アップロードしたファイルから作成した一時ドキュメント。",
    category: "network",
    format: isConfig ? formatFromFileName(file.name) : "toml",
    output: "markdown",
    updated: new Date().toISOString().slice(0, 10),
    live: true,
    data: isConfig ? content : CG.configToml,
    template: isConfig ? CG.templateJ2 : content,
  };
}

function readFileText(file: File): Promise<string> {
  const decodeBytes = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const detected = Encoding.detect(bytes, ["UTF8", "SJIS", "EUCJP", "JIS", "UTF16"]) || "UTF8";
    const unicode = Encoding.convert(bytes, { to: "UNICODE", from: detected });
    return Encoding.codeToString(unicode);
  };
  if ("arrayBuffer" in file && typeof file.arrayBuffer === "function") {
    return file.arrayBuffer().then(decodeBytes);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(decodeBytes(reader.result));
      else resolve(String(reader.result || ""));
    };
    reader.onerror = () => reject(reader.error || new Error(`Failed to read ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export function App() {
  const [route, setRoute] = React.useState<Route>(routeFromHash);
  const [settings, setSettings] = React.useState<GenerateSettings>(DEFAULT_SETTINGS);
  const [download, setDownload] = React.useState<DownloadOptions>(DEFAULT_DOWNLOAD);
  const [draftTemplate, setDraftTemplate] = React.useState<Template | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const on = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (hash: string) => { location.hash = hash; };
  const back = () => history.back();
  const openEditor = (tpl: Template | null) => {
    setDraftTemplate(null);
    setUploadError(null);
    go(tpl ? "#/t/" + encodeURIComponent(tpl.id) : "#/new");
  };
  const openUploadedFile = async (file: File, kind: "config" | "template") => {
    try {
      const content = await readFileText(file);
      setUploadError(null);
      setDraftTemplate(uploadedTemplate(file, content, kind));
      go("#/new");
    } catch {
      setUploadError(`${file.name} を読み込めませんでした。別のファイルを選択してください。`);
    }
  };

  const editorInitial = route.initial || draftTemplate;

  const content =
    route.view === "editor" ? (
      <Editor
        key={editorInitial ? `${editorInitial.id}:${editorInitial.name}` : "blank"}
        initial={editorInitial}
        onBack={back}
        settings={settings}
        onSettings={setSettings}
        download={download}
        onDownload={setDownload}
      />
    ) : route.view === "library" ? (
      <Library onOpen={openEditor} onClose={back} />
    ) : (
      <EmptyState
        onStart={() => openEditor(null)}
        onLibrary={() => go("#/library")}
        onConfigFile={(file) => void openUploadedFile(file, "config")}
        onTemplateFile={(file) => void openUploadedFile(file, "template")}
        onUploadError={setUploadError}
        uploadError={uploadError}
      />
    );

  const analytics = analyticsLocation();
  return (
    <>
      {content}
      {/* Keep Analytics here so hash-route pageviews use the route-aware props. */}
      <Analytics route={analytics.route} path={analytics.path} />
    </>
  );
}
