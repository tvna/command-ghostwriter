import type { Format } from "./format";

export type TemplateCategory = "network" | "server" | "dns" | "runbook";
export type TemplateOutput = "cli" | "config" | "markdown";

export interface Template {
  id: string;
  name: string;
  desc: string;
  category: TemplateCategory;
  format: Format;
  output: TemplateOutput;
  updated: string;
  live: boolean;
  data: string;
  template: string;
}
