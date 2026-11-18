/** File system and path helpers shared by the scanner. */
import fs from "node:fs";
import path from "node:path";

export const SKIP_DIRS = new Set(["build", "run", "runs", ".gradle", ".git", ".idea", "out", "bin", "node_modules", ".modsmith"]);
export const CODE_EXT = new Set([".java", ".kt"]);

/** All files under root, as sorted forward-slash paths relative to root. */
export function listFiles(root) {
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

export function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export function readProperties(file) {
  const props = {};
  for (let line of readText(file).split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#") || line.startsWith("!") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    props[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return props;
}

export function readJson(file) {
  return JSON.parse(readText(file));
}

/** True for client-only source paths: client packages, client source sets, recipe-viewer plugins. */
export function isClientPath(rel) {
  const p = rel.toLowerCase();
  if (p.includes("/client/") || p.startsWith("src/client/") || p.includes("/src/client/")) return true;
  // Recipe-viewer plugins (JEI, REI, EMI) are only loaded on the client.
  return ["jei", "rei", "emi"].some((seg) => p.includes(`/${seg}/`));
}

// Multi-module projects (multiloader: common/, fabric/, neoforge/...) keep sources under <module>/src/.
export const isSrc = (rel) => /(^|\/)src\//.test(rel);
export const isGenerated = (rel) => /(^|\/)src\/generated\//.test(rel);
export const isMainResources = (rel) => /(^|\/)src\/main\/(resources|templates)\//.test(rel);
export const moduleOf = (rel) => (rel.startsWith("src/") ? "" : rel.split("/src/")[0]);

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const lineOf = (text, index) => text.slice(0, index).split("\n").length;

export function parseVersion(v) {
  if (!v) return [];
  return (v.match(/\d+/g) || []).slice(0, 3).map(Number);
}

/** True if a parsed version is >= target ("1.21"). */
export function atLeast(version, target) {
  if (!version.length) return false;
  const t = parseVersion(target);
  for (let i = 0; i < Math.max(version.length, t.length); i++) {
    const a = version[i] ?? -1;
    const b = t[i] ?? -1;
    if (a !== b) return a > b;
  }
  return true;
}
