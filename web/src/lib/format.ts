// Explicit config format. The user picks this; we never re-detect it implicitly.
export type Format = "toml" | "yaml" | "csv";

// The worker's parser is chosen by the config file's extension (configName).
// Mapping the explicit Format to a fixed filename is the root-cause fix for the
// old implicit-format-detection bug.
export function configFileName(format: Format): string {
  return `config.${format}`;
}
