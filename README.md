# Modsmith: a Claude skill for Minecraft mod development

`modsmith` is a [Claude Code](https://claude.com/claude-code) skill that helps you **create, understand, fix, audit and port Minecraft Java mods** (NeoForge, Fabric, Forge, multiloader) with good engineering practices.

It works for first-time modders (it explains every concept, picks safe defaults and always tells you the next step) and for experienced developers (short, technical answers, you stay in control of commits).

## What it does

**New mod, from an idea to a playable mod.** Describe the mod in a few sentences. Modsmith picks loader and Minecraft version from what the idea needs (and checks that the mods it depends on exist there), creates the project from the official template, and writes a plan with small milestones. Each milestone is one command and ends with something you can try in game.

**Existing mod, from "what does this do?" to a clean codebase.** Modsmith maps the mod, audits it with prioritized findings, fixes them in batches with backups and verification, and reviews your changes before you commit.

**Port.** Plan and carry out a move to another Minecraft version or loader, one axis at a time, with dependency checks and save-compatibility notes.

## Commands

| Command | What it does |
|---|---|
| `/modsmith init` | Detects the project (or creates a new one from the official template, starting from your idea), sets up git and writes `.modsmith/PROFILE.md` so you're never asked the same questions twice |
| `/modsmith plan [idea]` | Turns an idea ("tiered furnaces", "a Create addon driven by RPM") into `.modsmith/DESIGN.md`: mechanics, content, dependency check, open design questions and a roadmap of playable milestones, each mapped to the command that builds it |
| `/modsmith study [area]` | Maps the mod into `.modsmith/STUDY.md`: entry points, registries, events, networking, saved data, mixins, key gameplay flows |
| `/modsmith audit` | Prioritized report in `.modsmith/AUDIT.md` (**CRITICAL / HIGH / MEDIUM / LOW**), each finding with evidence, impact, fix and effort, plus a fix plan and questions for the author when something may be intentional |
| `/modsmith fix [ID \| description \| crash log]` | Root-cause fix with the smallest change, save-compatibility checks and a build; with no argument it proposes the next batch from the audit |
| `/modsmith new <kind> <name>` | Adds a complete feature (block, item, block entity, menu, packet, config, mixin…): registration, models, loot table, translations, tags, creative tabs and integrations, following the plan |
| `/modsmith port <target>` | Version port (`port 1.21.4`), loader port (`port neoforge`), both in two stages, or a second loader (`port +fabric`) |
| `/modsmith verify` | Build, datagen, gametests and a dedicated-server start, with an honest pass/fail table |
| `/modsmith review` | Checks your uncommitted changes (or the last fixes, without git) before you commit |

You can also just talk normally ("my mod crashes on the server, here's the log"): Modsmith picks the right command.

## How it works

- **Profile.** `init` records loader, versions, mappings, dependencies, your experience level (beginner, intermediate, expert), reply and document languages, and how commits are handled. Every other command reads it.
- **Documents in `.modsmith/`.** `PROFILE.md`, `DESIGN.md`, `STUDY.md`, `AUDIT.md`, `PORT-<target>.md`. Commit them as project documentation, or keep them out of git. Use `--out=<folder>` to work read-only (for example on someone else's mod).
- **Verify before writing code.** APIs change a lot between Minecraft versions and loaders, so Modsmith checks the real classes in your Gradle cache and the official docs instead of trusting memory, and says when something couldn't be verified.
- **Safety rules.** Git or backups before every change, smallest possible change, save compatibility, never a global setting changed, never a push. Commits follow the policy you choose in `init`: Modsmith commits each step, only proposes commit messages, or asks every time.
- **Standard expectations.** Every mod with blocks or items gets its own creative tab plus the right vanilla tabs; recipe-viewer (JEI, REI, EMI) and Jade support are offered as optional integrations, added only where the content needs them.
- **GitHub (optional).** `init` can add an automatic build workflow and a Modrinth/CurseForge publish workflow; you only add the tokens as repository secrets. Also available later as `/modsmith new ci`.
- **Heuristic scanner.** `scripts/scan.mjs` gives the audit quick leads (side leaks, data keys that no codec reads, 1.21 folder names, unknown ids in loot tables, per-tick sync, config registered twice, risky mixins…). Leads, not verdicts: every one is confirmed by reading the code.

## Installation

### As a Claude Code plugin (recommended)

**Claude desktop app:** go to **Marketplace → Add → Add from repository**, enter `Carmineh/ModSmith`, then install **modsmith** from it. Typing the `/plugin` commands in the app's message box is not enough.

**Claude Code in a terminal:**

```
/plugin marketplace add Carmineh/ModSmith
/plugin install modsmith@modsmith
```

Update later with `/plugin update` (or from the Marketplace in the app). If you previously linked the skill with `install.ps1` / `install.sh`, remove that link first (`-Uninstall` / `--uninstall`) so the skill is not loaded twice. As a plugin the command is namespaced (`/modsmith:modsmith audit`), or just ask in plain words ("audit my mod").

### As a Codex plugin

```bash
codex plugin marketplace add Carmineh/ModSmith
codex plugin add modsmith@modsmith
```

Start a new Codex session afterwards and ask for the skill by name ("$modsmith audit") or in plain words.

### With the generic skills CLI

```bash
npx skills add https://github.com/Carmineh/ModSmith --skill modsmith
```

### From a clone (linked, updates with `git pull`)

```bash
git clone https://github.com/Carmineh/ModSmith.git
```

macOS / Linux:

```bash
./ModSmith/install.sh               # Claude Code (default)
./ModSmith/install.sh --codex       # Codex
./ModSmith/install.sh --all-agents  # both
```

Windows (PowerShell, no admin needed):

```powershell
.\ModSmith\install.ps1              # Claude Code (default)
.\ModSmith\install.ps1 -Codex       # Codex
.\ModSmith\install.ps1 -AllAgents   # both
```

The scripts link the skill folder (`~/.claude/skills/modsmith`, `~/.codex/skills/modsmith`) and accept `--uninstall` / `-Uninstall`. Restart your agent, then run `/modsmith` inside your mod's folder.

**Requirements:** Node 18+ for the scanner (already there if you use Claude Code) and the JDK your Minecraft version needs for builds.

## Tested on

Modsmith was developed against real projects before release:

- an existing NeoForge 1.21.1 content mod with known problems (study, audit, fixes, a port plan to 26.1.2);
- a large open-source multiloader mod (NeoForge + Fabric), read-only: the audit found a real item-duplication bug;
- two new mods built from scratch with the guided path (Fabric and NeoForge), including gametests that were proven to fail on a deliberate bug;
- a copy of a clean mod with 8 bugs planted on purpose: an independent audit found **8 of 8**, and the clean original produced **no false CRITICAL or HIGH**.

## Repository layout

```
.claude-plugin/              Claude Code plugin and marketplace
.codex-plugin/               Codex plugin manifest
.agents/plugins/             Codex marketplace
.github/workflows/           CI (tests on Linux and Windows, skill lint) and release on tags
skills/modsmith/
├── SKILL.md                 entry point: commands, profile, guided path, safety rules, severity
├── references/
│   ├── commands/            full procedure for each command
│   ├── audit/               severity criteria, checklist, report template
│   ├── loaders/             NeoForge, Fabric, Forge idioms and a cross-loader map
│   ├── versions/            breaking changes between Minecraft versions, up to 26.1
│   ├── practices/           sides, networking, persistence, mixins, performance, compatibility
│   ├── api-lookup.md        how to verify an API against the real classes
│   └── glossary.md          plain-language definitions for beginners
├── assets/                  templates for PROFILE.md and DESIGN.md
└── scripts/
    ├── scan.mjs             scanner entry point
    ├── lib/                 files, inventory, Java structure reader, scan pipeline, report
    └── checks/              one file per area: code, config, data, assets, mixins
tests/                       scanner tests (node:test, tiny fake mods)
tools/                       skill lint and release notes (used by CI)
install.sh, install.ps1      linked installs for Claude Code and Codex
```

## Development

```bash
npm test                      # scanner tests (Node 22+, built-in runner, nothing to install)
node tools/lint-skill.mjs     # frontmatter (YAML), referenced files, manifests, UTF-8, scripts parse
```

Each test builds a tiny fake mod with one pattern (and a safe variant that must stay silent). CI runs both on every push. To release, bump the version in both `plugin.json` files, add the section to `CHANGELOG.md`, and push a `vX.Y.Z` tag: the release workflow checks everything and publishes the GitHub release.

## Status

Focused on NeoForge and Fabric from 1.20.5 to 1.21.x, with orientation notes up to 26.1. Loader and version references point the skill to the right places; it is instructed to confirm APIs in the actual project. Corrections and contributions are welcome.

## License

[MIT](LICENSE). Minecraft is a trademark of Mojang AB; this project is not affiliated with or endorsed by Mojang or Microsoft.
