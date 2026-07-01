import React from "react";
import { Analytics } from "@vercel/analytics/react";
import Encoding from "encoding-japanese";
import { EmptyState } from "./components/EmptyState";
import { Library } from "./components/Library";
import { Editor } from "./components/Editor";
import { CGTemplates } from "./lib/templates";
import type { Template } from "./lib/types";
import type { Format } from "./lib/format";
import type { DownloadOptions } from "./components/SettingsModal";
import { DEFAULT_SETTINGS, type GenerateSettings } from "./worker/types";

type Route = { view: "empty" | "library" | "editor"; initial: Template | null };
type UploadedPart = { file: File; content: string };
type UploadKind = "config" | "template";

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

function uploadedTemplate(config: UploadedPart, template: UploadedPart): Template {
  return {
    id: "uploaded-files",
    name: `${config.file.name} + ${template.file.name}`,
    desc: "アップロードした2つのファイルから作成した一時ドキュメント。",
    category: "network",
    format: formatFromFileName(config.file.name),
    output: "markdown",
    updated: new Date().toISOString().slice(0, 10),
    live: true,
    data: config.content,
    template: template.content,
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
  const [uploadErrors, setUploadErrors] = React.useState<Record<UploadKind, string | null>>({ config: null, template: null });
  const [uploadedConfig, setUploadedConfig] = React.useState<UploadedPart | null>(null);
  const [uploadedJinjaTemplate, setUploadedJinjaTemplate] = React.useState<UploadedPart | null>(null);
  const uploadVersionRef = React.useRef<Record<UploadKind, number>>({ config: 0, template: 0 });

  React.useEffect(() => {
    const on = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (hash: string) => { location.hash = hash; };
  const back = () => history.back();
  const openEditor = (tpl: Template | null) => {
    uploadVersionRef.current.config += 1;
    uploadVersionRef.current.template += 1;
    setDraftTemplate(null);
    setUploadErrors({ config: null, template: null });
    setUploadedConfig(null);
    setUploadedJinjaTemplate(null);
    go(tpl ? "#/t/" + encodeURIComponent(tpl.id) : "#/new");
  };
  const openUploadedFile = async (file: File, kind: UploadKind) => {
    const uploadVersion = uploadVersionRef.current[kind] + 1;
    uploadVersionRef.current[kind] = uploadVersion;
    try {
      const content = await readFileText(file);
      if (uploadVersionRef.current[kind] !== uploadVersion) return;
      setUploadErrors((current) => ({ ...current, [kind]: null }));
      const uploaded = { file, content };
      if (kind === "config") setUploadedConfig(uploaded);
      else setUploadedJinjaTemplate(uploaded);
    } catch {
      if (uploadVersionRef.current[kind] !== uploadVersion) return;
      if (kind === "config") setUploadedConfig(null);
      else setUploadedJinjaTemplate(null);
      setUploadErrors((current) => ({
        ...current,
        [kind]: `${file.name} を読み込めませんでした。別のファイルを選択してください。`,
      }));
    }
  };
  const handleUploadError = (kind: UploadKind, message: string) => {
    uploadVersionRef.current[kind] += 1;
    if (kind === "config") setUploadedConfig(null);
    else setUploadedJinjaTemplate(null);
    setUploadErrors((current) => ({ ...current, [kind]: message }));
  };

  React.useEffect(() => {
    if (route.view !== "empty" || !uploadedConfig || !uploadedJinjaTemplate) return;
    setDraftTemplate(uploadedTemplate(uploadedConfig, uploadedJinjaTemplate));
    setUploadedConfig(null);
    setUploadedJinjaTemplate(null);
    setUploadErrors({ config: null, template: null });
    go("#/new");
  }, [route.view, uploadedConfig, uploadedJinjaTemplate]);

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
        onConfigUploadError={(message) => handleUploadError("config", message)}
        onTemplateUploadError={(message) => handleUploadError("template", message)}
        uploadError={uploadErrors.config || uploadErrors.template}
        configFileName={uploadedConfig?.file.name || null}
        templateFileName={uploadedJinjaTemplate?.file.name || null}
      />
    );

  const analytics = analyticsLocation();
  return (
    <>
      {content}
      <Analytics route={analytics.route} path={analytics.path} />
    </>
  );
}
