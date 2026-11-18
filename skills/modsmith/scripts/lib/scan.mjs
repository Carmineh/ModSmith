/** Runs every check on a mod folder and returns { inventory, findings, review_points }. */
import { listFiles, parseVersion } from "./files.mjs";
import { buildInventory } from "./inventory.mjs";
import { checkCode } from "../checks/code.mjs";
import { checkConfig } from "../checks/config.mjs";
import { checkData } from "../checks/data.mjs";
import { checkAssets } from "../checks/assets.mjs";
import { checkMixins } from "../checks/mixins.mjs";

/**
 * Order matters: checkCode runs first and fills ctx.index (codec fields, registered names,
 * config registrations, code text) that the other checks read.
 */
const CHECKS = [checkCode, checkConfig, checkData, checkAssets, checkMixins];

export function scan(root) {
  const rels = listFiles(root);
  const inv = buildInventory(root, rels);
  const findings = {};
  const review = {};
  const ctx = {
    root,
    rels,
    inv,
    mc: parseVersion(inv.minecraft_version),
    add(checkId, sev, desc, loc, line = "") {
      findings[checkId] ||= { severity_hint: sev, description: desc, hits: [] };
      findings[checkId].hits.push({ location: loc, code: String(line).trim().slice(0, 160) });
    },
    addReview(id, loc) {
      (review[id] ||= []).push(loc);
    },
    index: { codecFields: new Set(), registeredNames: new Set(), configSpecs: [], codeText: [] },
  };
  for (const check of CHECKS) check(ctx);
  return { inventory: inv, findings, review_points: review };
}
