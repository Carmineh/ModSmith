---
name: modsmith
description: Develop and maintain Minecraft Java mods (NeoForge, Fabric, Forge) following good engineering practices. Commands - init (detect or scaffold a mod project and save a profile), study (map an existing mod's architecture), audit (prioritized CRITICAL/HIGH/MEDIUM/LOW report), fix (fix audit findings, bugs or crash logs), new (add blocks, items, entities, packets, configs...), port (move a mod to another Minecraft version or loader), verify (build + headless server check), review (check uncommitted changes). Use this skill whenever the user works on a Minecraft mod - creating, reading, debugging, fixing a crash, refactoring, auditing, updating or porting it - or mentions NeoForge, Fabric, Forge, mixins, mods.toml, fabric.mod.json, registries, datagen or a Minecraft crash report, even if they don't type /modsmith.
---

# Modsmith — Minecraft mod development & maintenance

This skill helps create, understand, fix and evolve Minecraft Java mods with sound engineering practices. It is used by everyone from first-time modders to experienced developers, so it adapts how much it explains.

## Why this skill exists (read this first)

Minecraft modding is a domain where confident-but-wrong code is the norm. APIs change drastically between versions (NeoForge split from Forge in 1.20.2, item NBT became data components in 1.20.5, data folders were renamed in 1.21, networking was rewritten around payloads) and between loaders. Memory of "how it's done" is very often for the wrong version.

So the single most important habit: **verify against the actual project before writing code.** Check the loader and Minecraft version in the profile, look at how the project already does things, and when unsure about an API, look it up in the project's dependencies instead of guessing — `references/api-lookup.md` explains how to read the real classes from the Gradle cache. If you couldn't verify something, say so.

The second habit, for audits: **most real bugs in content mods are logic and data bugs**, not API misuse — features that are documented but never read, timers that never tick, data files whose keys don't match the codec. Check game logic as carefully as technical patterns.

## Commands

The user invokes the skill as `/modsmith <command> [args]`. If they talk naturally instead ("can you check my mod for problems?"), map the request to the closest command and say which one you're running.

| Command | Purpose | Details |
|---|---|---|
| `init` | Detect (or scaffold) the project, ask what's missing, write the profile | `references/commands/init.md` |
| `study [area]` | Map the mod's architecture | `references/commands/study.md` |
| `audit [--scope=path] [--min=LEVEL]` | Prioritized findings report | `references/commands/audit.md` |
| `fix <ID \| description \| crash log>` | Root-cause fix with minimal change | `references/commands/fix.md` |
| `new <kind> <name>` | Add a feature the idiomatic way | `references/commands/new.md` |
| `port <target>` | Version and/or loader migration | `references/commands/port.md` |
| `verify` | Build + headless server + gametests | `references/commands/verify.md` |
| `review` | Audit only the uncommitted changes | `references/commands/review.md` |

Read the command's reference file before executing it — each one contains the full procedure and output format. With no command (`/modsmith` alone), briefly list the commands and suggest the next sensible one based on the project state (no profile → `init`; profile but no study → `study`; etc.).

## The profile

Every command except `init` starts by reading `.modsmith/profile.md` in the mod's root. It records loader, Minecraft version, language, mappings, mod id, dependencies, the user's experience level and project conventions. It exists so the user is never asked the same questions twice.

- If it's missing, offer to run `init` first (you can do a quick inline detection if the user just wants a fast answer, but say the profile would make future runs better).
- If what you see in the build files contradicts the profile (e.g. the version was bumped), trust the build files, tell the user, and update the profile.

### Where outputs go

Commands write their documents (`profile.md`, `STUDY.md`, `AUDIT.md`, `PORT-<target>.md`) to the **modsmith directory**:
- default: `.modsmith/` in the mod's root;
- `--out=<dir>` on any command: write there instead and don't create anything in the mod (use this for read-only studies, or when auditing someone else's mod);
- the profile can set a permanent location (`modsmith_dir`).

The first time a command would create `.modsmith/` inside a git repository, say so and ask whether to commit it (useful documentation and a maintenance log — recommended for your own mods) or ignore it — via `.gitignore`, or via `.git/info/exclude` when the repository belongs to someone else (keeps their tracked files untouched). `study`, `audit` and `review` never modify mod files — only the modsmith directory.

### Language

Two separate settings in the profile:
- `reply_language` — the language you talk to the user in (inferred from their messages).
- `docs_language` — the language of the documents written in the modsmith directory. Default English, because these files usually live in a shareable repository; `init` asks once.

Code, identifiers, file names and commit messages are always English.

### Non-interactive runs

When nobody can answer questions (CI, subagents, batch runs), don't block: use defaults (`experience: intermediate`, `docs_language: en`, outputs to `--out` if given). Values the caller supplied in the request count as the user's answers — record them normally. Mark only values you chose yourself with `(assumed)` in the profile, and list them at the start of your chat summary.

### Chained commands

"`init`, then `study`, then `audit`" (or similar) means: run them in order without stopping between them, reuse what earlier steps produced (profile, STUDY, scan output), and give one combined summary at the end instead of one per command.

### Code references

Cite code with the **path relative to the mod's root**, always in the same form: `src/main/java/com/example/block/FooBlock.java:42` (resources likewise: `src/main/resources/data/<ns>/...`). No shortened package-relative paths — a full path is unambiguous and clickable both in documents and in chat links (in chat, link it as `[FooBlock.java:42](src/main/java/.../FooBlock.java:42)`). Take line numbers from a per-file view (the Read tool, or `grep -n` on one file) — concatenating several files with `cat -n` numbers them as one stream and gives wrong references.

## Adapting to the user's experience level

The profile stores `experience: beginner | intermediate | expert`.

- **beginner**: define a modding term the first time it appears (or point to `references/glossary.md`), explain *why* for every recommendation, choose the safest option yourself instead of presenting many alternatives, and give exact commands to run. In reports, each finding gets a plain-language "why it matters" line.
- **intermediate**: brief explanations only for non-obvious points.
- **expert**: terse, technical, no hand-holding.

Reply in the user's language (`reply_language`); write documents in `docs_language` (see "Language" above).

## Safety rules for changing code

These exist because mods live in people's worlds — a careless change can corrupt saves or break a server.

1. **Git is the safety net.** Before modifying code, check `git status`. If there are uncommitted changes the user didn't make in this session, mention them before touching anything. Multi-step work (fix batches, ports) goes on a dedicated branch (`fix/<topic>`, `port/<target>`); ask before creating or switching branches. Never push, create remote repositories, or rewrite history unless the user asks.
2. **Minimal, root-cause changes.** Fix the cause, not the symptom; don't refactor unrelated code in the same change. If you notice other problems, note them (or add them to `AUDIT.md`) instead of silently fixing them.
3. **Save compatibility.** Changing registry names, NBT/codec keys, data component or attachment ids breaks existing worlds. When a change touches persisted data, flag it explicitly and provide a migration path (fallback reading of old keys, aliases, data fixers) or get the user's explicit OK.
4. **Verify after changing.** Run the `verify` procedure (at least `build`; `runServer` when sides, registration or networking were touched). Report the actual result — if something couldn't be run, say so.
5. **Don't invent versions.** For build files, dependency versions and Gradle plugins, read them from the project or official sources; never write version numbers from memory.

## Severity scale (shared by audit, review, fix, port)

- **CRITICAL** — crashes, world/save corruption or data loss, dedicated-server crashes, exploitable server trust issues (unvalidated client packets → dupes, arbitrary actions).
- **HIGH** — client/server desync, memory leaks, heavy per-tick work, threading violations, fragile mixins that break mod compatibility, wrong-side logic that "works in singleplayer".
- **MEDIUM** — deprecated/removed API use, hardcoded values that belong in config, hand-written data that should be datagen, missing translations, god classes, missing null/empty checks without immediate crash.
- **LOW** — naming, structure, comments/docs, warnings, minor style.

Full criteria, examples and tie-break rules: `references/audit/severity.md`.

## Reference map

Load only what the current task needs.

- `references/commands/*.md` — procedure for each command.
- `references/audit/` — `severity.md`, `checklist.md` (what to look for, by area), `report-template.md`.
- `references/loaders/` — `neoforge.md`, `fabric.md`, `forge.md` (idioms for each loader, focused on 1.20.x–1.21.x), `porting-map.md` (equivalents across loaders).
- `references/versions/breaking-changes.md` — what changed between Minecraft versions that matters for porting and auditing.
- `references/practices/` — `sides.md`, `networking.md`, `persistence.md`, `mixins.md`, `performance.md`, `compatibility.md`. Read the relevant one when writing or reviewing code in that area.
- `references/api-lookup.md` — how to verify an API against the real Minecraft/loader classes in the project's Gradle cache.
- `references/glossary.md` — plain-language definitions for beginners.
- `assets/profile-template.md` — template for `.modsmith/profile.md`.
- `scripts/scan.mjs` — fast heuristic scanner (`node scripts/scan.mjs <mod-root>`; Node 18+ ships with Claude Code, nothing to install). It produces leads, not verdicts: confirm every hit by reading the code before reporting it.
