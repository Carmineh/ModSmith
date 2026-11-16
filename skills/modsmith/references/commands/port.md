# port — version and/or loader migration

## Syntax

| Command | Meaning |
|---|---|
| `port 1.21.1` | Change Minecraft version, same loader |
| `port neoforge` | Change loader, same version — **replaces** the current loader |
| `port neoforge@1.21.1` | Change both (done in two stages, see below) |
| `port +neoforge` | **Add** a loader → multiloader project (advanced) |

If the user isn't sure which they want, ask two questions: "Do you want to stop supporting the current loader?" and "Do you already have users on both loaders?". Default recommendation, especially for beginners: **replace**. Multiloader means a restructured project (`common` + one module per loader + a platform abstraction) and every future feature costs more — worth it only for mature, actively maintained mods with users on both loaders. Before `+loader`, explain this cost in plain words and get explicit confirmation.

## Golden rule: one axis at a time

If both version and loader change, first port the version on the current loader and verify, then change the loader. Doing both at once makes every error ambiguous ("is this a 1.21 change or a NeoForge difference?").

## Stage 1 — Analysis (no code changes)

1. Read profile and `STUDY.md` (run `study` first if missing — porting a mod you don't understand goes badly).
2. Inventory everything that depends on the version or loader: build files, metadata, entry points, registration, events, networking, config, persistence (NBT/components/attachments), mixins (+ targets!), access transformers/wideners, client registration, resources (folder names, formats), datagen.
3. Consult `references/versions/breaking-changes.md` for every version step crossed (1.20.4→1.21.1 crosses 1.20.5/1.20.6 and 1.21) and `references/loaders/porting-map.md` for loader changes. These are starting points, not complete lists: also check the loader's official porting primers / changelogs for each step.
4. **Dependencies:** for each mod dependency, check it exists for the target version/loader. A missing hard dependency is a **blocker** — report it before touching code, with options (wait, drop the feature, replace the library, make it optional).
5. Save compatibility: will existing worlds load? (Item NBT → components needs a migration; vanilla's data fixers handle vanilla data, not the mod's custom keys.)

## Stage 2 — Plan

Write `PORT-<target>.md` in the modsmith directory:

```markdown
# Port to <target>
Source: <loader> <version> @ <commit>. Branch: port/<target>.
## Blockers
## Dependencies (source → target availability)
## Steps
| # | Step | Files | Risk | Verify by | Status |
## Manual work (things with no direct equivalent)
## Save compatibility notes
```

Order steps so the project compiles as early as possible: build setup → metadata → registration → everything else area by area → resources → datagen → mixins last (they fail at runtime, not compile time). Show the plan and get the user's go-ahead.

## Stage 3 — Execute

- Work on branch `port/<target>` (ask first). Without git: work on a copy of the folder.
- Build files: take them from the official template for the target (see init.md §3), then re-apply the mod's customizations. Don't hand-edit version numbers from memory.
- One step at a time; after each, build. Update the Status column. Commit per step only if the user wants commits.
- When an API has no equivalent, stop and explain the options instead of inventing one.
- Final verification: `build`, `runData` (if datagen), `runServer` headless, gametests; then give the user an in-game test checklist (each feature in STUDY.md).

## Stage 4 — Close

Update `.modsmith/profile.md` (loader/version/mappings/deps), mark the plan complete, and list anything left (manual tests, features dropped, follow-ups).
