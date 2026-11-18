/** Markdown rendering of a scan result. */
import { REVIEW_POINTS } from "../checks/code.mjs";

const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const fmt = (v) => (Array.isArray(v) ? `[${v.join(", ")}]` : String(v));

export function toMarkdown(result, { inventoryOnly = false, all = false } = {}) {
  const limit = all ? Infinity : 25;
  const inv = result.inventory;
  const out = ["# Modsmith scan", "", "## Inventory", ""];
  for (const k of ["loader", "modules", "minecraft_version", "loader_version", "mod_id", "mappings", "kotlin", "code_files",
    "mixin_configs", "access_transformer", "has_datagen_output", "has_gametests", "ci"]) {
    out.push(`- **${k}:** ${fmt(inv[k])}`);
  }
  out.push("- **packages:**");
  for (const [p, c] of Object.entries(inv.packages)) out.push(`  - \`${p}\` (${c})`);
  if (inventoryOnly) return out.join("\n");

  out.push("", "## Leads (confirm each by reading the code: '?' means severity depends on context)", "");
  const rank = (f) => SEV_ORDER[f.severity_hint.replace("?", "")] ?? 9;
  const items = Object.entries(result.findings).sort((a, b) => rank(a[1]) - rank(b[1]));
  if (!items.length) out.push("_No heuristic hits._");
  for (const [cid, f] of items) {
    out.push(`### ${cid}: ${f.severity_hint} (${f.hits.length})`, f.description);
    for (const h of f.hits.slice(0, limit)) out.push(`- ${h.location}${h.code ? `: \`${h.code}\`` : ""}`);
    if (f.hits.length > limit) out.push(`- … ${f.hits.length - limit} more (use --all)`);
    out.push("");
  }

  out.push("## Review points (not problems by themselves)", "");
  for (const [rid, desc] of REVIEW_POINTS) {
    const locs = result.review_points[rid] || [];
    if (!locs.length) continue;
    out.push(`- **${rid}** (${locs.length}): ${desc}`);
    for (const loc of locs.slice(0, 15)) out.push(`  - ${loc}`);
    if (locs.length > 15) out.push(`  - … ${locs.length - 15} more`);
  }
  return out.join("\n");
}
