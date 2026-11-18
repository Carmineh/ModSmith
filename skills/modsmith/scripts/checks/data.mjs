/** Checks on data files: 1.21 folder names, keys vs codecs, unknown ids, lang, template leftovers. */
import path from "node:path";
import { atLeast, escapeRe, isGenerated, isMainResources, readText } from "../lib/files.mjs";

const LEGACY_DATA_DIRS_121 = {
  recipes: "recipe", loot_tables: "loot_table", advancements: "advancement", structures: "structure",
  predicates: "predicate", item_modifiers: "item_modifier", functions: "function",
};
const LEGACY_TAG_DIRS_121 = { blocks: "block", items: "item", entity_types: "entity_type", fluids: "fluid", game_events: "game_event" };

// Data folders owned by vanilla/loaders; anything else under data/<modid>/ is the mod's custom data.
const KNOWN_DATA_DIRS = new Set([
  "recipe", "recipes", "loot_table", "loot_tables", "tags", "advancement", "advancements", "worldgen",
  "dimension", "dimension_type", "structure", "structures", "damage_type", "enchantment",
  "enchantment_provider", "banner_pattern", "chat_type", "trim_material", "trim_pattern", "wolf_variant",
  "painting_variant", "jukebox_song", "predicate", "predicates", "item_modifier", "item_modifiers",
  "function", "functions", "neoforge", "forge", "fabric", "c", "datapacks", "loot_modifiers", "instrument",
  "data_maps", "atlases", "models", "patchouli_books",
]);
const IGNORED_DATA_KEYS = new Set(["type", "neoforge:conditions", "fabric:load_conditions", "forge:conditions", "conditions", "replace"]);

const toSnake = (key) => key.replace(/(?<!^)(?=[A-Z])/g, "_").toLowerCase();

export function checkData(ctx) {
  const { inv } = ctx;
  if (ctx.mc.length && atLeast(ctx.mc, "1.21")) checkLegacyFolders(ctx);
  if (inv.mod_id) {
    checkDataKeys(ctx);
    checkDataReferences(ctx);
    checkLang(ctx);
  }
  checkTemplateLeftovers(ctx);
}

function checkLegacyFolders({ rels, add }) {
  const seen = new Set();
  for (const r of rels) {
    let m = r.match(/resources\/data\/([^/]+)\/([^/]+)\//);
    if (m && LEGACY_DATA_DIRS_121[m[2]]) {
      const key = `data/${m[1]}/${m[2]}`;
      if (!seen.has(key)) {
        seen.add(key);
        add("legacy-data-folder", "HIGH",
          `Pre-1.21 data folder name: these files are ignored in 1.21+ ('${m[2]}' → '${LEGACY_DATA_DIRS_121[m[2]]}').`, r);
      }
    }
    m = r.match(/resources\/data\/([^/]+)\/tags\/([^/]+)\//);
    if (m && LEGACY_TAG_DIRS_121[m[2]]) {
      const key = `data/${m[1]}/tags/${m[2]}`;
      if (!seen.has(key)) {
        seen.add(key);
        add("legacy-data-folder", "HIGH",
          `Pre-1.21 tag folder name: these tags are ignored in 1.21+ ('tags/${m[2]}' → 'tags/${LEGACY_TAG_DIRS_121[m[2]]}').`, r);
      }
    }
  }
}

/** Keys in the mod's custom data JSON that no codec in the code declares. */
function checkDataKeys({ root, rels, inv, add, index }) {
  const { codecFields } = index;
  if (!codecFields.size) return;
  const rx = new RegExp(`resources/data/${escapeRe(inv.mod_id)}/([^/]+)/.+\\.json$`);
  for (const r of rels) {
    const m = r.match(rx);
    if (!m || KNOWN_DATA_DIRS.has(m[1]) || isGenerated(r)) continue;
    let data;
    try {
      data = JSON.parse(readText(path.join(root, r)));
    } catch {
      add("data-invalid-json", "HIGH", "Data file is not valid JSON and will be skipped.", r);
      continue;
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;
    for (const key of Object.keys(data)) {
      if (IGNORED_DATA_KEYS.has(key) || codecFields.has(key)) continue;
      const hint = codecFields.has(toSnake(key)) ? `: did you mean '${toSnake(key)}'?` : "";
      add("data-key-mismatch", "HIGH?",
        "Key in a custom data file that no codec reads: Mojang codecs ignore unknown keys silently, so the value falls back to its default.",
        r, `"${key}"${hint}`);
    }
  }
}

/** Ids in the mod's own namespace referenced by loot tables and recipes that match no model, blockstate or registration. */
function checkDataReferences({ root, rels, inv, add, index }) {
  const modId = inv.mod_id;
  const known = new Set(index.registeredNames);
  const assetRx = new RegExp(`assets/${escapeRe(modId)}/(?:models/item|models/block|blockstates|items)/(.+)\\.json$`);
  for (const r of rels) {
    const m = r.match(assetRx);
    if (m) known.add(m[1]);
  }
  if (!known.size) return;
  const rx = /resources\/data\/[^/]+\/(?:loot_tables?|recipes?)\/.+\.json$/;
  const prefix = modId + ":";
  const visit = (node, file) => {
    if (Array.isArray(node)) return node.forEach((n) => visit(n, file));
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string" && ["name", "id", "item"].includes(key) && value.startsWith(prefix)) {
        if (!known.has(value.slice(prefix.length))) {
          add("unknown-id-in-data", "HIGH?",
            "Loot table or recipe references an id in the mod's namespace that matches no model, blockstate or registration (typo?): the drop or recipe result silently fails.",
            file, value);
        }
      } else {
        visit(value, file);
      }
    }
  };
  for (const r of rels) {
    if (!rx.test(r) || isGenerated(r)) continue;
    try {
      visit(JSON.parse(readText(path.join(root, r))), r);
    } catch {
      add("data-invalid-json", "HIGH", "Data file is not valid JSON and will be skipped.", r);
    }
  }
}

function checkLang({ rels, inv, add }) {
  const langRx = new RegExp(`assets/${escapeRe(inv.mod_id)}/lang/en_us\\.json$`);
  if (!rels.some((r) => langRx.test(r))) {
    add("missing-lang", "MEDIUM", `No assets/${inv.mod_id}/lang/en_us.json found (datagen output counts).`, "src/main/resources");
  }
}

function checkTemplateLeftovers({ root, rels, add }) {
  for (const r of rels) {
    if (isMainResources(r) && (r.endsWith(".toml") || r.endsWith(".json"))) {
      if (/examplemod|Example Mod|examplemod\.png/.test(readText(path.join(root, r)))) {
        add("template-leftovers", "LOW", "MDK/template placeholder content left in metadata/resources.", r);
      }
    }
  }
}
