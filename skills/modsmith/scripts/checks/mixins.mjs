/** Checks on mixin configs: client mixins in the common list, missing defaultRequire. */
import path from "node:path";
import { readText } from "../lib/files.mjs";

const CLIENT_MIXIN = [
  /^\s*import\s+net\.minecraft\.client\./m,
  /@Mixin\(\s*\{?\s*(Minecraft|\w*Renderer|\w*Screen|\w*Model)\b/,
  /@Mixin\([^)]*targets\s*=\s*\{?\s*"(net\.minecraft\.client\.|com\.mojang\.blaze3d\.)/,
];

export function checkMixins({ root, rels, inv, add }) {
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
          if (CLIENT_MIXIN.some((rx) => rx.test(t))) {
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
}
