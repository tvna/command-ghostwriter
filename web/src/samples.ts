const raw = import.meta.glob("../../assets/examples/*.{toml,yaml,yml,csv,j2,jinja2}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

function byName(filename: string): string {
  const entry = Object.entries(raw).find(([key]) => key.endsWith("/" + filename));
  if (entry === undefined) throw new Error(`sample not found: ${filename}`);
  return entry[1];
}

export interface Sample {
  label: string;
  config: string;
  template: string;
}

export const SAMPLES: Sample[] = [
  { label: "Cisco", config: byName("cisco_config.toml"), template: byName("cisco_template.jinja2") },
  { label: "DNS dig", config: byName("dns_dig_config.csv"), template: byName("dns_dig_tmpl.j2") },
  { label: "Success", config: byName("success_config.yaml"), template: byName("success_template.j2") },
];
