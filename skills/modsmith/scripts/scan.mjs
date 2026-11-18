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
 *
 * Layout: lib/ (files, inventory, Java structure, report, scan pipeline), checks/ (one file per area).
 */
import fs from "node:fs";
import path from "node:path";
import { scan } from "./lib/scan.mjs";
import { toMarkdown } from "./lib/report.mjs";

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
  console.log(
    args.includes("--json")
      ? JSON.stringify(result, null, 2)
      : toMarkdown(result, { inventoryOnly: args.includes("--inventory"), all: args.includes("--all") }),
  );
  return 0;
}

process.exitCode = main();
