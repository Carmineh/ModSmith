#!/usr/bin/env node
/**
 * modsmith heuristic scanner.
 *
 * Fast, dependency-free scan of a Minecraft mod project (Node 18+, no npm install).
 * It produces LEADS for an audit, not verdicts: every hit must be confirmed by reading the code.
 *
 * Usage:
 *   node scan.mjs <mod-root>                # findings report (markdown)
 *   node scan.mjs <mod-root> --inventory    # project inventory only
 *   node scan.mjs <mod-root> --all          # every hit (default: first 25 per check)
 *   node scan.mjs <mod-root> --json         # machine-readable output
 */
import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set(["build", "run", "runs", ".gradle", ".git", ".idea", "out", "bin", "node_modules", ".modsmith"]);
const CODE_EXT = new Set([".java", ".kt"]);

// --------------------------------------------------------------------------- utils

function parseVersion(v) {
  if (!v) return [];
  return (v.match(/\d+/g) || []).slice(0, 3).map(Number);
}

function atLeast(version, target) {
  if (!version.length) return false;
  const t = parseVersion(target);
  for (let i = 0; i < Math.max(version.length, t.length); i++) {
    const a = version[i] ?? -1;
    const b = t[i] ?? -1;
    if (a !== b) return a > b;
  }
  return true;
}

function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) out.push(full);
    }
  };
  walk(root);
  return out.map((f) => path.relative(root, f).split(path.sep).join("/")).sort();
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function readProperties(file) {
  const props = {};
  for (let line of readText(file).split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#") || line.startsWith("!") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    props[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return props;
}

function isClientPath(rel) {
  const p = rel.toLowerCase();
  if (p.includes("/client/") || p.startsWith("src/client/") || p.includes("/src/client/")) return true;
  // Recipe-viewer plugins (JEI, REI, EMI) are only loaded on the client.
  return ["jei", "rei", "emi"].some((seg) => p.includes(`/${seg}/`));
}

// Multi-module projects (multiloader: common/, fabric/, neoforge/…) keep sources under <module>/src/.
const isSrc = (rel) => /(^|\/)src\//.test(rel);
const isGenerated = (rel) => /(^|\/)src\/generated\//.test(rel);
const isMainResources = (rel) => /(^|\/)src\/main\/(resources|templates)\//.test(rel);
const moduleOf = (rel) => (rel.startsWith("src/") ? "" : rel.split("/src/")[0]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

// --------------------------------------------------------------------------- inventory

/** Mod id from the loader metadata when gradle.properties doesn't have it (typical for Fabric). */
function modIdFromMetadata(root, rels) {
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

/** Ids in the mod's own namespace referenced by loot tables and recipes that match no item model or blockstate. */
function checkDataReferences(root, rels, modId, registered, add) {
  const known = new Set(registered);
  for (const r of rels) {
    const m = r.match(new RegExp(`assets/${escapeRe(modId)}/(?:models/item|models/block|blockstates|items)/(.+)\\.json$`));
    if (m) known.add(m[1]);
  }
  if (!known.size) return;
  const rx = new RegExp(`resources/data/[^/]+/(?:loot_tables?|recipes?)/.+\\.json$`);
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

function buildInventory(root, rels) {
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

// --------------------------------------------------------------------------- checks

// [id, suggested severity, description, regex, applies to client files, min MC version]
const LINE_CHECKS = [
  ["client-import-in-common", "CRITICAL?",
    "Client-only class imported outside a client package/source set. Critical only if this class loads on a dedicated server.",
    /^\s*import\s+(net\.minecraft\.client\.|net\.neoforged\.neoforge\.client\.|net\.minecraftforge\.client\.|net\.fabricmc\.fabric\.api\.client\.|com\.mojang\.blaze3d\.)/,
    false, null],
  ["minecraft-getinstance-in-common", "CRITICAL?", "Minecraft.getInstance() outside client code.",
    /\bMinecraft\.getInstance\(\)/, false, null],
  ["mixin-overwrite", "HIGH", "@Overwrite replaces the whole method and breaks other mods.", /@Overwrite\b/, true, null],
  ["mixin-redirect", "MEDIUM?", "@Redirect conflicts with other mods redirecting the same call; prefer MixinExtras.",
    /@Redirect\b/, true, null],
  ["thread-sleep", "HIGH?", "Thread.sleep may block the server/render thread.", /\bThread\.sleep\s*\(/, true, null],
  ["new-thread", "HIGH?", "Manual thread creation: check that no game state is touched off-thread.",
    /\bnew\s+Thread\s*\(|Executors\.new/, true, null],
  ["system-out", "LOW", "System.out/err used instead of a logger (MEDIUM if in a tick path).",
    /\bSystem\.(out|err)\.print/, true, null],
  ["print-stack-trace", "MEDIUM", "printStackTrace() instead of logging with context.", /\.printStackTrace\s*\(\s*\)/, true, null],
  ["new-resource-location", "CRITICAL?",
    "new ResourceLocation(...) is not accessible since 1.21 (use fromNamespaceAndPath/parse).",
    /\bnew\s+ResourceLocation\s*\(/, true, "1.21"],
  ["item-nbt-api", "MEDIUM?", "ItemStack NBT API (getTag/getOrCreateTag/setTag): replaced by data components in 1.20.5+.",
    /\.(getOrCreateTag|getTag)\s*\(\s*\)|\.setTag\s*\(/, true, "1.20.5"],
  ["static-collection-of-game-objects", "HIGH?",
    "Static collection keyed/valued by game objects or UUIDs: possible memory leak, unsaved state, or state shared between logical sides.",
    // fields only: "static ... Map<...Player...> NAME =" or ";" (not static methods returning collections)
    /\bstatic\b[^=;(]*\b(Map|HashMap|WeakHashMap|ConcurrentHashMap|List|ArrayList|Set|HashSet)\s*<[^;=(]*\b(Entity|Player|ServerPlayer|LivingEntity|Level|ServerLevel|BlockEntity|ItemStack|UUID|Cow|Mob|Animal)\b[^;=(]*>\s*\w+\s*[=;]/,
    true, null],
  ["new-random", "LOW", "new Random(): prefer the level/entity RandomSource.", /\bnew\s+(java\.util\.)?Random\s*\(/, true, null],
  ["reflection", "MEDIUM?", "Reflection: fragile across versions/obfuscation; prefer access transformers/wideners or accessors.",
    /\.(getDeclaredField|getDeclaredMethod|setAccessible)\s*\(/, true, null],
];

// Locations to review manually (not problems per se).
const REVIEW_POINTS = [
  ["tick-hooks", "Tick hooks: check early returns, side checks and throttling.",
    /\b(EntityTickEvent|LevelTickEvent|ServerTickEvent|PlayerTickEvent|TickEvent|ServerTickEvents|ServerEntityEvents|void\s+tick\s*\(|serverTick|clientTick)\b/],
  ["entity-queries", "Entity/area queries: check radius and frequency.",
    /\b(getEntitiesOfClass|getEntities|getNearbyEntities|BlockPos\.betweenClosed|BlockPos\.withinManhattan)\s*\(/],
  ["server-bound-packets", "Client→server payload handlers: check server-side validation.",
    /\b(playToServer|registerGlobalReceiver|playBidirectional|PacketDistributor\.sendToServer|ClientPlayNetworking\.send|messageBuilder)\b/],
  ["interaction-handlers", "Interaction handlers that fire on both sides: check isClientSide.",
    /\b(PlayerInteractEvent|EntityInteract|UseEntityCallback|UseBlockCallback|mobInteract|interactAt|InteractionResult\s+use\w*)\b/],
  ["persistence", "Save/load code: check stable keys and tolerant loading.",
    /\b(saveAdditional|loadAdditional|addAdditionalSaveData|readAdditionalSaveData|SavedData|AttachmentType|DataComponentType)\b/],
  ["client-imports-guarded", "Client imports used only inside client-only classes/methods (Dist.CLIENT, initializeClient): fine, listed for completeness.", null],
];

const LEGACY_DATA_DIRS_121 = {
  recipes: "recipe", loot_tables: "loot_table", advancements: "advancement", structures: "structure",
  predicates: "predicate", item_modifiers: "item_modifier", functions: "function",
};
const LEGACY_TAG_DIRS_121 = { blocks: "block", items: "item", entity_types: "entity_type", fluids: "fluid", game_events: "game_event" };

const CLIENT_CLASS_DECL =
  /\bclass\s+\w+[^{]*\b(extends|implements)\s+[^{]*\b(\w*Screen|\w*Renderer|BlockEntityRenderer|EntityRenderer|BlockEntityWithoutLevelRenderer|EntityModel|HierarchicalModel|Model|BakedModel|RenderLayer|Particle|ParticleProvider|AbstractContainerScreen|ClientTooltipComponent)\b/;
const TICK_METHODS = new Set(["tick", "aiStep", "baseTick", "serverTick", "customServerAiStep", "inactiveTick"]);
const CHANGE_CALLBACKS = new Set(["onContentsChanged", "onEnergyChanged", "onChanged"]);
const CLIENT_METHODS = new Set(["initializeClient", "registerClient", "onInitializeClient", "clientSetup"]);
const DECL_TYPE = /\b(class|interface|enum|record)\s+(\w+)/;
const DECL_METHOD =
  /^\s*(?:@\w+(?:\([^)]*\))?\s+)*(?:(?:public|protected|private|static|final|abstract|synchronized|default|native)\s+)*(?:<[^>]+>\s*)?[\w.$<>\[\]?, ]+?\s+(\w+)\s*\(/;
const NOT_METHODS = new Set(["if", "for", "while", "switch", "catch", "return", "new", "else", "throw", "synchronized", "try"]);
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

function stripLiterals(s) {
  s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
  s = s.replace(/'(?:\\.|[^'\\])'/g, "''");
  return s.split("//")[0];
}

const count = (s, ch) => s.split(ch).length - 1;

/** Very small brace-tracking parser: marks lines inside client-only classes/methods and finds method spans. */
function analyzeStructure(lines) {
  const client = new Array(lines.length).fill(false);
  const methods = []; // [name, start, end]
  const stack = [];
  let depth = 0;
  let pendingClient = false;
  let pendingDecl = null;
  lines.forEach((raw, i) => {
    const s = stripLiterals(raw);
    const st = s.trim();
    if (st.startsWith("@") && (st.includes("Dist.CLIENT") || (st.includes("OnlyIn") && st.includes("CLIENT")))) {
      pendingClient = true;
    }
    let decl = null;
    if (!["import", "package", "*", "/*", "@"].some((p) => st.startsWith(p))) {
      const t = s.match(DECL_TYPE);
      if (t && !s.split(t[0])[0].includes("new ")) {
        decl = ["type", t[2]];
      } else {
        const m = s.match(DECL_METHOD);
        if (m && !NOT_METHODS.has(m[1]) && !st.endsWith(";") && !s.split("(")[0].includes("=")) decl = ["method", m[1]];
      }
    }
    if (decl === null && pendingDecl !== null && s.includes("{")) {
      decl = pendingDecl;
      pendingDecl = null;
    } else if (decl !== null && !s.includes("{")) {
      pendingDecl = decl;
      decl = null;
    }
    const parentClient = stack.some((e) => e.client);
    if (decl !== null) {
      const isClient = pendingClient || parentClient || (decl[0] === "method" && CLIENT_METHODS.has(decl[1]));
      stack.push({ name: decl[1], kind: decl[0], depth, client: isClient, start: i });
      pendingClient = false;
    }
    client[i] = stack.some((e) => e.client);
    depth += count(s, "{") - count(s, "}");
    while (stack.length && depth <= stack[stack.length - 1].depth) {
      const e = stack.pop();
      if (e.kind === "method") methods.push([e.name, e.start, i]);
    }
  });
  return { client, methods };
}

/** 'client-only' if the imported name is only used in client regions, 'unused' if never used, else 'common'. */
function clientImportUsage(importLine, lines, clientFlags) {
  const m = importLine.match(/import\s+(?:static\s+)?[\w.]*\.(\w+)\s*;/);
  if (!m || m[1] === "*") return "common";
  const rx = new RegExp(`\\b${m[1]}\\b`);
  const used = [];
  lines.forEach((l, i) => {
    if (!l.trim().startsWith("import") && rx.test(l)) used.push(i);
  });
  if (!used.length) return "unused";
  return used.every((i) => clientFlags[i]) ? "client-only" : "common";
}

const toSnake = (key) => key.replace(/(?<!^)(?=[A-Z])/g, "_").toLowerCase();

/** Report keys in the mod's custom data JSON that no codec in the code declares. */
function checkDataKeys(root, rels, modId, codecFields, add) {
  if (!codecFields.size) return;
  const rx = new RegExp(`resources/data/${escapeRe(modId)}/([^/]+)/.+\\.json$`);
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

function checkItemModels(root, rels, modId, registered, add, allCode = "") {
  const marker = `/assets/${modId}/`;
  const first = rels.find((r) => r.includes(marker));
  if (!first) return;
  const base = first.split(marker)[0] + marker;
  const textures = new Set(
    rels.filter((r) => r.startsWith(base + "textures/") && r.endsWith(".png")).map((r) => r.slice((base + "textures/").length, -4)),
  );
  const referenced = new Set();
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
  for (const tex of [...textures].sort()) {
    // textures referenced from code (GUI slot icons, sprites) are not missing a model
    if (tex.startsWith("item/") && !referenced.has(tex) && !allCode.includes(tex)) {
      add("texture-without-model", "MEDIUM?",
        "Item texture not referenced by any model: if the item is registered it probably renders as missing-texture.",
        `${base}textures/${tex}.png`);
    }
  }
}

function scan(root) {
  const rels = listFiles(root);
  const inv = buildInventory(root, rels);
  const mc = parseVersion(inv.minecraft_version);
  const findings = {};
  const review = {};
  const addReview = (id, loc) => (review[id] ||= []).push(loc);
  const add = (checkId, sev, desc, loc, line = "") => {
    findings[checkId] ||= { severity_hint: sev, description: desc, hits: [] };
    findings[checkId].hits.push({ location: loc, code: String(line).trim().slice(0, 160) });
  };

  const codecFields = new Set();
  const codeText = [];
  const registeredNames = new Set();
  const configSpecs = [];

  for (const rel of rels) {
    if (!CODE_EXT.has(path.extname(rel)) || !isSrc(rel) || isGenerated(rel)) continue;
    const text = readText(path.join(root, rel));
    const lines = text.split(/\r?\n/);
    const clientFile = isClientPath(rel);
    const mixinFile = rel.toLowerCase().includes("/mixin/");
    const info = analyzeStructure(lines);

    // A class that is itself a client class (renderer, screen, model…) only loads on the client:
    // its client imports are expected. Common in multiloader `common/` modules.
    const clientClass = CLIENT_CLASS_DECL.test(text);
    codeText.push(text);
    for (const m of text.matchAll(/(?:optionalFieldOf|fieldOf)\(\s*"([^"]+)"/g)) codecFields.add(m[1]);
    for (const m of text.matchAll(/\bregister\w*\(\s*"([a-z0-9_./-]+)"/g)) registeredNames.add(m[1]);
    for (const m of text.matchAll(/registerConfig\(\s*[\w.]+\s*,\s*([\w.]+)/g)) {
      configSpecs.push([m[1].split(".").pop(), `${rel}:${lineOf(text, m.index)}`]);
    }

    lines.forEach((line, idx) => {
      const n = idx + 1;
      const stripped = line.trim();
      if (stripped.startsWith("//") || stripped.startsWith("*") || stripped.startsWith("/*")) return;
      const inClient = clientFile || clientClass || info.client[idx];
      for (const [cid, sev, desc, rx, appliesClient, minMc] of LINE_CHECKS) {
        if (!appliesClient && inClient) continue;
        // client mixins legitimately import client classes; the mixin config check covers them
        if ((cid.startsWith("client-import") || cid.startsWith("minecraft-getinstance")) && mixinFile) continue;
        if (minMc && mc.length && !atLeast(mc, minMc)) continue;
        if (!rx.test(line)) continue;
        if (cid === "client-import-in-common") {
          const usage = clientImportUsage(stripped, lines, info.client);
          if (usage === "client-only") {
            addReview("client-imports-guarded", `${rel}:${n}`);
            continue;
          }
          if (usage === "unused") {
            add("unused-client-import", "LOW", "Unused client import in common code (harmless, but remove it).", `${rel}:${n}`, line);
            continue;
          }
        }
        add(cid, sev, desc, `${rel}:${n}`, line);
      }
      if (/isLoaded\(/.test(line) && /\bregister\w*\(/.test(line)) {
        add("conditional-registration", "MEDIUM",
          "Registration depends on installed mods: registry contents differ between packs (client/server mismatch, items vanish from worlds when a mod is removed). Register always, hide instead.",
          `${rel}:${n}`, line);
      }
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
        add("empty-catch", "MEDIUM", "Exception swallowed by an empty catch block.", `${rel}:${n}`, line);
      }
      for (const [rid, , rx] of REVIEW_POINTS) {
        if (rx && rx.test(line)) addReview(rid, `${rel}:${n}`);
      }
    });

    // Method-level checks
    const setters = new Set();
    for (const [name, s, e] of info.methods) {
      for (let i = s; i <= e; i++) if (lines[i].includes("entityData.set(")) setters.add(name);
    }
    for (const [name, s, e] of info.methods) {
      if (TICK_METHODS.has(name)) {
        const calls = [/entityData\.set\(/, ...[...setters].filter((x) => x !== name).map((x) => new RegExp(`\\b${escapeRe(x)}\\s*\\(`))];
        for (let i = s + 1; i <= e; i++) {
          if (calls.some((c) => c.test(lines[i]))) {
            add("synced-data-set-in-tick", "HIGH?",
              "Synched entity data changed from a tick method: if the value changes every tick, every tracking player receives an update packet per entity per tick.",
              `${rel}:${i + 1}`, lines[i]);
          }
        }
      }
      if (CHANGE_CALLBACKS.has(name)) {
        for (let i = s + 1; i <= e; i++) {
          if (lines[i].includes("sendBlockUpdated")) {
            add("block-update-on-content-change", "MEDIUM?",
              "Full block-entity sync on every inventory/fluid/energy change. HIGH if the handler is filled or drained every tick by pipes, cables or generators.",
              `${rel}:${i + 1}`, lines[i]);
          }
        }
      }
    }
  }

  // Config spec registered more than once
  const bySpec = {};
  for (const [spec, loc] of configSpecs) (bySpec[spec] ||= []).push(loc);
  for (const [spec, locs] of Object.entries(bySpec)) {
    if (locs.length > 1) {
      for (const loc of locs) {
        add("config-registered-twice", "HIGH?",
          `Config spec '${spec}' registered ${locs.length} times (e.g. COMMON and SERVER): two files back the same values and the last one loaded wins.`,
          loc);
      }
    }
  }

  // Resource checks
  if (mc.length && atLeast(mc, "1.21")) {
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

  const modId = inv.mod_id;
  if (modId) {
    checkDataKeys(root, rels, modId, codecFields, add);
    checkItemModels(root, rels, modId, registeredNames, add, codeText.join("\n"));
    checkDataReferences(root, rels, modId, registeredNames, add);
    const langRx = new RegExp(`assets/${escapeRe(modId)}/lang/en_us\\.json$`);
    if (!rels.some((r) => langRx.test(r))) {
      add("missing-lang", "MEDIUM", `No assets/${modId}/lang/en_us.json found (datagen output counts).`, "src/main/resources");
    }
  }

  for (const r of rels) {
    if (isMainResources(r) && (r.endsWith(".toml") || r.endsWith(".json"))) {
      if (/examplemod|Example Mod|examplemod\.png/.test(readText(path.join(root, r)))) {
        add("template-leftovers", "LOW", "MDK/template placeholder content left in metadata/resources.", r);
      }
    }
  }

  // Mixin configs: client classes targeted by mixins listed in the common "mixins" array
  for (const mcRel of inv.mixin_configs) {
    let cfg;
    try {
      cfg = JSON.parse(readText(path.join(root, mcRel)));
    } catch {
      add("mixin-config-invalid", "CRITICAL?", "Mixin config is not valid JSON.", mcRel);
      continue;
    }
    const pkg = cfg.package || "";
    for (const name of [...(cfg.mixins || []), ...(cfg.server || [])]) {
      const pathPart = `${pkg}.${name}`.replaceAll(".", "/");
      for (const ext of [".java", ".kt"]) {
        for (const c of rels.filter((r) => r.endsWith(pathPart + ext))) {
          const t = readText(path.join(root, c));
          if (
            /^\s*import\s+net\.minecraft\.client\./m.test(t) ||
            /@Mixin\(\s*\{?\s*(Minecraft|\w*Renderer|\w*Screen|\w*Model)\b/.test(t) ||
            /@Mixin\([^)]*targets\s*=\s*\{?\s*"(net\.minecraft\.client\.|com\.mojang\.blaze3d\.)/.test(t)
          ) {
            add("client-mixin-in-common-list", "CRITICAL?",
              "Mixin touching client classes listed in the common 'mixins' array (should be in 'client').", `${mcRel} → ${name}`);
          }
        }
      }
    }
    if (cfg.injectors?.defaultRequire === undefined) {
      add("mixin-no-default-require", "LOW", "Mixin config without injectors.defaultRequire: failed injections may be silent.", mcRel);
    }
  }

  return { inventory: inv, findings, review_points: review };
}

// --------------------------------------------------------------------------- output

const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const fmt = (v) => (Array.isArray(v) ? `[${v.join(", ")}]` : String(v));

function toMarkdown(result, inventoryOnly, all = false) {
  const LIMIT = all ? Infinity : 25;
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
  const items = Object.entries(result.findings).sort(
    (a, b) => (SEV_ORDER[a[1].severity_hint.replace("?", "")] ?? 9) - (SEV_ORDER[b[1].severity_hint.replace("?", "")] ?? 9),
  );
  if (!items.length) out.push("_No heuristic hits._");
  for (const [cid, f] of items) {
    out.push(`### ${cid}: ${f.severity_hint} (${f.hits.length})`, f.description);
    for (const h of f.hits.slice(0, LIMIT)) out.push(`- ${h.location}${h.code ? `: \`${h.code}\`` : ""}`);
    if (f.hits.length > LIMIT) out.push(`- … ${f.hits.length - LIMIT} more (use --all)`);
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

function main() {
  const args = process.argv.slice(2);
  const rootArg = args.find((a) => !a.startsWith("--"));
  if (!rootArg || args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node scan.mjs <mod-root> [--inventory] [--all] [--json]");
    return rootArg ? 0 : 2;
  }
  const root = path.resolve(rootArg);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    return 2;
  }
  const result = scan(root);
  console.log(args.includes("--json") ? JSON.stringify(result, null, 2) : toMarkdown(result, args.includes("--inventory"), args.includes("--all")));
  return 0;
}

process.exitCode = main();
