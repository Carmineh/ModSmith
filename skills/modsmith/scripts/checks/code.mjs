/** Checks on Java/Kotlin sources: sides, threading, mixins, sync in tick, change callbacks. */
import path from "node:path";
import { CODE_EXT, atLeast, escapeRe, isClientPath, isGenerated, isSrc, lineOf, readText } from "../lib/files.mjs";
import { CLIENT_CLASS_DECL, analyzeStructure, clientImportUsage } from "../lib/java-structure.mjs";

// [id, suggested severity, description, regex, applies to client files, min MC version]
export const LINE_CHECKS = [
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

// Locations to review manually (not problems by themselves).
export const REVIEW_POINTS = [
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

const TICK_METHODS = new Set(["tick", "aiStep", "baseTick", "serverTick", "customServerAiStep", "inactiveTick"]);
const CHANGE_CALLBACKS = new Set(["onContentsChanged", "onEnergyChanged", "onChanged"]);

/**
 * Scans every source file. Besides adding findings, fills ctx.index with what other checks need:
 * codec field names, registered names, config registrations and the concatenated code.
 */
export function checkCode(ctx) {
  const { root, rels, mc, add, addReview, index } = ctx;
  for (const rel of rels) {
    if (!CODE_EXT.has(path.extname(rel)) || !isSrc(rel) || isGenerated(rel)) continue;
    const text = readText(path.join(root, rel));
    const lines = text.split(/\r?\n/);
    const clientFile = isClientPath(rel);
    const mixinFile = rel.toLowerCase().includes("/mixin/");
    const info = analyzeStructure(lines);

    // A class that is itself a client class (renderer, screen, model...) only loads on the client:
    // its client imports are expected. Common in multiloader `common/` modules.
    const clientClass = CLIENT_CLASS_DECL.test(text);
    index.codeText.push(text);
    for (const m of text.matchAll(/(?:optionalFieldOf|fieldOf)\(\s*"([^"]+)"/g)) index.codecFields.add(m[1]);
    for (const m of text.matchAll(/\bregister\w*\(\s*"([a-z0-9_./-]+)"/g)) index.registeredNames.add(m[1]);
    for (const m of text.matchAll(/registerConfig\(\s*[\w.]+\s*,\s*([\w.]+)/g)) {
      index.configSpecs.push([m[1].split(".").pop(), `${rel}:${lineOf(text, m.index)}`]);
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

    checkMethods(rel, lines, info.methods, add);
  }
}

function checkMethods(rel, lines, methods, add) {
  const setters = new Set();
  for (const [name, s, e] of methods) {
    for (let i = s; i <= e; i++) if (lines[i].includes("entityData.set(")) setters.add(name);
  }
  for (const [name, s, e] of methods) {
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
