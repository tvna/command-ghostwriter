import type { Format } from "./format";

// Domain axis: what the template is about. Kept purely by technology domain.
export type TemplateCategory = "network" | "server" | "dns" | "ai" | "ops";
export type TemplateOutput = "cli" | "config" | "markdown";
// Activity axis: what the template is for. Orthogonal to the domain category.
// Omitted `activity` is treated as "build" (construction / configuration).
export type TemplateActivity = "build" | "troubleshoot" | "security-response" | "change" | "routine" | "drill";

export interface Template {
  id: string;
  name: string;
  desc: string;
  category: TemplateCategory;
  subCategory: string;
  format: Format;
  output: TemplateOutput;
  activity?: TemplateActivity;
  updated: string;
  live: boolean;
  data: string;
  template: string;
}
