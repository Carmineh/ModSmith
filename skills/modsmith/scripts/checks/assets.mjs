/** Checks on client assets: models vs textures, orphan bucket models. */
import path from "node:path";
import { readText } from "../lib/files.mjs";

export function checkAssets({ root, rels, inv, add, index }) {
  const modId = inv.mod_id;
  if (!modId) return;
  const marker = `/assets/${modId}/`;
  const first = rels.find((r) => r.includes(marker));
  if (!first) return;
  const base = first.split(marker)[0] + marker;
  const textures = new Set(
    rels.filter((r) => r.startsWith(base + "textures/") && r.endsWith(".png")).map((r) => r.slice((base + "textures/").length, -4)),
  );
  const referenced = new Set();
  const registered = index.registeredNames;
  for (const r of rels) {
    if (!(r.startsWith(base + "models/") && r.endsWith(".json"))) continue;
    let model;
    try {
      model = JSON.parse(readText(path.join(root, r)));
    } catch {
      add("model-invalid-json", "MEDIUM", "Model file is not valid JSON.", r);
      continue;
    }
    for (const tex of Object.values(model.textures || {})) {
      if (typeof tex !== "string" || tex.startsWith("#")) continue;
      const [ns, texPath] = tex.includes(":") ? tex.split(/:(.*)/s) : ["minecraft", tex];
      if (ns === modId) {
        referenced.add(texPath);
        if (!textures.has(texPath)) {
          add("model-missing-texture", "MEDIUM", "Model references a texture that doesn't exist (missing-texture in game).", r, tex);
        }
      }
    }
    const fluid = model.fluid;
    if (typeof fluid === "string" && fluid.startsWith(modId + ":") && registered.size) {
      if (!registered.has(fluid.split(":")[1])) {
        add("model-unknown-fluid", "LOW", "Bucket model for a fluid the mod never registers (orphan file).", r, fluid);
      }
    }
  }
  const allCode = index.codeText.join("\n");
  for (const tex of [...textures].sort()) {
    // textures referenced from code (GUI slot icons, sprites) are not missing a model
    if (tex.startsWith("item/") && !referenced.has(tex) && !allCode.includes(tex)) {
      add("texture-without-model", "MEDIUM?",
        "Item texture not referenced by any model: if the item is registered it probably renders as missing-texture.",
        `${base}textures/${tex}.png`);
    }
  }
}
