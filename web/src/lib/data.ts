const raw = import.meta.glob("../../../assets/examples/cisco-switchport.{toml,j2}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

function byExt(ext: string): string {
  const hit = Object.entries(raw).find(([k]) => k.endsWith("." + ext));
  if (!hit) throw new Error(`cisco-switchport.${ext} not found`);
  return hit[1];
}

export const CG = {
  configToml: byExt("toml"),
  templateJ2: byExt("j2"),
};
