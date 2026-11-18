#!/usr/bin/env node
/** Prints the CHANGELOG.md section for a version. Usage: node tools/release-notes.mjs v1.0.0 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = (process.argv[2] || "").replace(/^v/, "");
if (!version) {
  console.error("Usage: node tools/release-notes.mjs <version>");
  process.exit(2);
}
const lines = fs.readFileSync(path.join(repo, "CHANGELOG.md"), "utf8").split(/\r?\n/);
const start = lines.findIndex((l) => new RegExp(`^## \[?${version.replace(/\./g, "\.")}\]?`).test(l));
if (start < 0) {
  console.error(`No "## ${version}" section in CHANGELOG.md`);
  process.exit(1);
}
const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
console.log(lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim());
