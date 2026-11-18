#!/usr/bin/env node
/**
 * Checks the repository before a release (also run by CI):
 *  - SKILL.md frontmatter parses as YAML (as Claude Code and Codex parse it) with a valid name and description;
 *  - every skill file referenced from SKILL.md and the command files exists;
 *  - plugin/marketplace JSON files parse, and their versions agree;
 *  - tracked text files are valid UTF-8 with no double encoding;
 *  - every script parses (node --check);
 *  - with --tag=vX.Y.Z: the plugin version matches the tag.
 * The YAML check needs the `yaml` package (CI installs it with `npm install --no-save yaml@2.6.1`);
 * without it the lint falls back to a simple check locally and fails on CI.
 * Usage: node tools/lint-skill.mjs [--tag=v1.0.0]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = path.join(repo, "skills", "modsmith");
const errors = [];
const notes = [];
const err = (msg) => errors.push(msg);
const read = (p) => fs.readFileSync(p, "utf8");

// 1. Frontmatter
const skill = read(path.join(skillDir, "SKILL.md"));
const fm = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fm) err("SKILL.md: missing frontmatter");
else {
  let meta = null;
  let yaml = null;
  try {
    yaml = await import("yaml");
  } catch {
    if (process.env.CI) err("yaml package missing: run `npm install --no-save --no-package-lock yaml@2.6.1` first");
    else notes.push("YAML parser not installed, frontmatter checked loosely (npm install --no-save --no-package-lock yaml@2.6.1 for the full check)");
  }
  if (yaml) {
    try {
      meta = yaml.parse(fm[1]);
      if (!meta || typeof meta !== "object") err("SKILL.md: frontmatter is not a YAML mapping");
    } catch (e) {
      err(`SKILL.md: frontmatter is not valid YAML (${e.message.split("\n")[0]})`);
    }
  } else {
    meta = {
      name: fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim(),
      description: fm[1].match(/^description:\s*(.+)$/m)?.[1]?.trim(),
    };
  }
  if (meta && typeof meta === "object") {
    if (meta.name !== "modsmith") err(`SKILL.md: name should be "modsmith", found "${meta.name}"`);
    if (typeof meta.description !== "string" || !meta.description.trim()) err("SKILL.md: missing description");
    else if (meta.description.length > 1024) err(`SKILL.md: description is ${meta.description.length} characters (max 1024)`);
  }
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

// 4. Text files are valid UTF-8 without double encoding.
// Double encoding (UTF-8 read as cp1252/latin-1 and saved again) turns an accented letter into
// U+00C3 plus a second char, and a curly quote into U+00E2 U+20AC ...; U+FFFD marks bytes that were lost.
const tracked = execSync("git ls-files", { cwd: repo, encoding: "utf8" }).split("\n").filter(Boolean);
const decoder = new TextDecoder("utf-8", { fatal: true });
const MOJIBAKE = /[\u00C2\u00C3][\u0080-\u00BF]|\u00E2\u20AC|\uFFFD/;
for (const rel of tracked) {
  if (!/\.(md|mjs|js|json|sh|ps1|yml|yaml|txt|toml|properties|java)$/i.test(rel)) continue;
  const file = path.join(repo, rel);
  if (!fs.existsSync(file)) continue;
  let text;
  try {
    text = decoder.decode(fs.readFileSync(file));
  } catch {
    err(`${rel}: not valid UTF-8`);
    continue;
  }
  if (text.charCodeAt(0) === 0xfeff) err(`${rel}: starts with a UTF-8 BOM`);
  text.split("\n").forEach((line, i) => {
    if (MOJIBAKE.test(line)) err(`${rel}:${i + 1}: looks double-encoded (${line.match(MOJIBAKE)[0]})`);
  });
}

// 5. Every script parses
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : /\.(mjs|js)$/i.test(e.name) ? [p] : [];
});
const scripts = [path.join(skillDir, "scripts"), path.join(repo, "tools"), path.join(repo, "tests")].filter((d) => fs.existsSync(d)).flatMap(walk);
for (const file of scripts) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (e) {
    const detail = String(e.stderr || "").split("\n").find((l) => /Error/.test(l)) || "syntax error";
    err(`${path.relative(repo, file)}: does not parse (${detail.trim()})`);
  }
}

// 6. Tag matches version
const tag = process.argv.find((a) => a.startsWith("--tag="))?.slice(6);
if (tag) {
  const expected = tag.replace(/^v/, "");
  if (distinct[0] !== expected) err(`tag ${tag} does not match plugin version ${distinct[0]}`);
}

for (const n of notes) console.log(`note: ${n}`);
if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log(`Skill lint OK (version ${distinct[0] ?? "n/a"}, ${tracked.length} files checked for encoding, ${scripts.length} scripts parsed).`);
}
