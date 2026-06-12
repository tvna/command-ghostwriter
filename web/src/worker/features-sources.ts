// Import every features/*.py as a raw string at build time (single source of truth).
// Keys look like "../../../features/core.py"; we normalize to "features/core.py".
const raw = import.meta.glob("../../../features/**/*.py", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

export const FEATURES_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(raw).map(([key, source]) => {
    const idx = key.lastIndexOf("/features/");
    return [key.slice(idx + 1), source];
  }),
);
