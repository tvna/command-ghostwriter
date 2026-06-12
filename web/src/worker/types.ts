export interface GenerateSettings {
  csvRowsName: string;
  enableAutoTranscoding: boolean;
  enableFillNan: boolean;
  fillNanWith: string;
  formatType: number; // 0..4
  isStrictUndefined: boolean;
}

export interface GenerateRequest {
  configText: string;
  configName: string; // e.g. "config.csv" -- extension drives parser selection
  templateText: string;
  templateName: string; // e.g. "template.j2"
  settings: GenerateSettings;
}

export interface GenerateResult {
  output: string | null;
  configError: string | null;
  templateError: string | null;
}

export const DEFAULT_SETTINGS: GenerateSettings = {
  csvRowsName: "csv_rows",
  enableAutoTranscoding: true,
  enableFillNan: true,
  fillNanWith: "#",
  formatType: 0,
  isStrictUndefined: true,
};

// Browser worker message contract.
export type WorkerInbound =
  | { kind: "init" }
  | { kind: "generate"; id: number; request: GenerateRequest };

export type WorkerOutbound =
  | { kind: "ready" }
  | { kind: "result"; id: number; result: GenerateResult }
  | { kind: "error"; id: number | null; message: string };
