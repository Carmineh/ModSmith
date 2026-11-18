/** Project inventory: loader, versions, mod id, modules, packages. */
import fs from "node:fs";
import path from "node:path";
import { CODE_EXT, isGenerated, isMainResources, moduleOf, readProperties, readText } from "./files.mjs";

/** Mod id from the loader metadata when gradle.properties doesn't have it (typical for Fabric). */
export function modIdFromMetadata(root, rels) {
  const fabric = rels.find((r) => isMainResources(r) && r.endsWith("fabric.mod.json"));
  if (fabric) {
    try {
      const id = JSON.parse(readText(path.join(root, fabric))).id;
      if (typeof id === "string" && !id.includes("$")) return id;
    } catch {
      /* fall through */
    }
  }
  const toml = rels.find((r) => isMainResources(r) && /mods\.toml$/.test(r));
  if (toml) {
    const m = readText(path.join(root, toml)).match(/^\s*modId\s*=\s*"([a-z0-9_]+)"/m);
    if (m) return m[1];
  }
  return null;
}

export function buildInventory(root, rels) {
  const props = fs.existsSync(path.join(root, "gradle.properties"))
    ? readProperties(path.join(root, "gradle.properties"))
    : {};
  const buildText = rels
    .filter((r) => /(^|\/)build\.gradle(\.kts)?$/.test(r))
    .map((r) => readText(path.join(root, r)))
    .join("\n");

  const loader = [];
  if (rels.some((r) => r.endsWith("neoforge.mods.toml")) || buildText.includes("net.neoforged")) loader.push("neoforge");
  if (rels.some((r) => r.endsWith("fabric.mod.json")) || buildText.includes("fabric-loom")) loader.push("fabric");
  if (
    buildText.includes("net.minecraftforge.gradle") ||
    (rels.some((r) => r.endsWith("META-INF/mods.toml")) && !loader.includes("neoforge"))
  )
    loader.push("forge");

  const mc = props.minecraft_version || props.mc_version || null;
  let mappings = buildText.toLowerCase().includes("yarn") ? "yarn" : loader.length ? "mojmap" : "unknown";
  if (buildText.includes("officialMojangMappings") || buildText.toLowerCase().includes("parchment")) mappings = "mojmap";

  const codeFiles = rels.filter((r) => CODE_EXT.has(path.extname(r)) && r.split("/").includes("src"));
  const packages = new Map();
  for (const r of codeFiles) {
    const m = readText(path.join(root, r)).match(/^\s*package\s+([\w.]+)/m);
    if (m) packages.set(m[1], (packages.get(m[1]) || 0) + 1);
  }
  const sortedPackages = Object.fromEntries([...packages.entries()].sort((a, b) => b[1] - a[1]));

  return {
    root,
    loader: loader.length ? loader : ["unknown"],
    minecraft_version: mc,
    loader_version: props.neo_version || props.neoforge_version || props.loader_version || props.fabric_loader_version || props.forge_version || null,
    mod_id: props.mod_id || props.modid || modIdFromMetadata(root, rels) || props.archives_base_name || null,
    mappings,
    kotlin: codeFiles.some((r) => r.endsWith(".kt")),
    code_files: codeFiles.length,
    packages: sortedPackages,
    mixin_configs: rels.filter((r) => /mixins?\.json$/.test(r) && r.includes("/resources/")),
    access_transformer: rels.filter((r) => r.endsWith("accesstransformer.cfg") || r.endsWith(".accesswidener")),
    has_datagen_output: rels.some(isGenerated),
    modules: [...new Set(rels.filter((r) => /\/src\/main\//.test("/" + r)).map(moduleOf))].map((m) => m || "(root)"),
    has_gametests: rels.some((r) => r.toLowerCase().includes("gametest")),
    ci: rels.filter((r) => r.startsWith(".github/workflows/")),
  };
}
