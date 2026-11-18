#!/usr/bin/env node
/**
 * Checks the repository before a release (also run by CI):
 *  - SKILL.md frontmatter has a valid name and description;
 *  - every skill file referenced from SKILL.md and the command files exists;
 *  - plugin/marketplace JSON files parse, and their versions agree;
 *  - no em dashes in tracked text files;
 *  - with --tag=vX.Y.Z: the plugin version matches the tag.
 * Usage: node tools/lint-skill.mjs [--tag=v1.0.0]
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = path.join(repo, "skills", "modsmith");
const EM_DASH = String.fromCharCode(0x2014);
const errors = [];
const err = (msg) => errors.push(msg);
const read = (p) => fs.readFileSync(p, "utf8");

// 1. Frontmatter
const skill = read(path.join(skillDir, "SKILL.md"));
const fm = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fm) err("SKILL.md: missing frontmatter");
else {
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const desc = fm[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  if (name !== "modsmith") err(`SKILL.md: name should be "modsmith", found "${name}"`);
  if (!desc) err("SKILL.md: missing description");
  else if (desc.length > 1024) err(`SKILL.md: description is ${desc.length} characters (max 1024)`);
}

// 2. Referenced files exist (paths written as `references/...`, `assets/...`, `scripts/...`)
const docs = [path.join(skillDir, "SKILL.md"), ...fs.readdirSync(path.join(skillDir, "references", "commands")).map((f) => path.join(skillDir, "references", "commands", f))];
for (const doc of docs) {
  for (const m of read(doc).matchAll(/`((?:references|assets|scripts)\/[\w./-]+\.(?:md|mjs))`/g)) {
    if (!fs.existsSync(path.join(skillDir, m[1]))) err(`${path.relative(repo, doc)}: references missing file ${m[1]}`);
  }
}
for (const m of skill.matchAll(/`(references\/commands\/[\w-]+\.md)`/g)) {
  if (!fs.existsSync(path.join(skillDir, m[1]))) err(`SKILL.md: command file ${m[1]} missing`);
}

// 3. Manifests parse and agree on the version
const manifests = [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", ".codex-plugin/plugin.json", ".agents/plugins/marketplace.json"];
const versions = {};
for (const rel of manifests) {
  const p = path.join(repo, rel);
  if (!fs.existsSync(p)) { err(`${rel}: missing`); continue; }
  try {
    const json = JSON.parse(read(p));
    if (json.version) versions[rel] = json.version;
  } catch (e) {
    err(`${rel}: invalid JSON (${e.message})`);
  }
}
const distinct = [...new Set(Object.values(versions))];
if (distinct.length > 1) err(`plugin versions disagree: ${JSON.stringify(versions)}`);

// 4. No em dashes in tracked text files
const tracked = execSync("git ls-files", { cwd: repo, encoding: "utf8" }).split("\n").filter(Boolean);
for (const rel of tracked) {
  if (!/\.(md|mjs|js|json|sh|ps1|yml|yaml|txt)$/.test(rel)) continue;
  const lines = read(path.join(repo, rel)).split("\n");
  lines.forEach((line, i) => {
    if (line.includes(EM_DASH)) err(`${rel}:${i + 1}: em dash`);
  });
}

// 5. Tag matches version
const tag = process.argv.find((a) => a.startsWith("--tag="))?.slice(6);
if (tag) {
  const expected = tag.replace(/^v/, "");
  if (distinct[0] !== expected) err(`tag ${tag} does not match plugin version ${distinct[0]}`);
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log(`Skill lint OK (version ${distinct[0] ?? "n/a"}, ${tracked.length} tracked files checked).`);
}
