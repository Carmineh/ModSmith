/** Test helpers: build tiny fake mod projects on disk and scan them. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scan } from "../skills/modsmith/scripts/lib/scan.mjs";

const NEOFORGE_PROPS = "minecraft_version=1.21.1\nneo_version=21.1.200\nmod_id=testmod\n";
const NEOFORGE_BUILD = "plugins { id 'net.neoforged.moddev' version '2.0.0' }\n";
const NEOFORGE_TOML = 'modLoader="javafml"\n[[mods]]\nmodId="testmod"\n';

/** A minimal, clean NeoForge 1.21.1 mod. Pass extra files as { "relative/path": "content" }. */
export function neoforgeMod(extra = {}) {
  return {
    "gradle.properties": NEOFORGE_PROPS,
    "build.gradle": NEOFORGE_BUILD,
    "src/main/resources/META-INF/neoforge.mods.toml": NEOFORGE_TOML,
    "src/main/resources/assets/testmod/lang/en_us.json": '{ "block.testmod.thing": "Thing" }',
    "src/main/java/com/example/testmod/TestMod.java": [
      "package com.example.testmod;",
      "",
      '@Mod("testmod")',
      "public class TestMod {",
      "    public TestMod() {",
      "    }",
      "}",
    ].join("\n"),
    ...extra,
  };
}

/** Writes the files into a fresh temporary folder and returns its path. */
export function writeMod(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "modsmith-test-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, ...rel.split("/"));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

/** Scans a fake mod and removes it afterwards. */
export function scanFiles(files) {
  const root = writeMod(files);
  try {
    return scan(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** Ids of the checks that reported at least one hit. */
export const findingIds = (result) => Object.keys(result.findings).sort();

/** Java source helper: joins lines. */
export const java = (...lines) => lines.join("\n");
