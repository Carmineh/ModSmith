# Modsmith: a Claude skill for Minecraft mod development

`modsmith` is a [Claude Code](https://claude.com/claude-code) skill that helps you **create, understand, fix, audit and port Minecraft Java mods** (NeoForge, Fabric, Forge) following good engineering practices. It works for first-time modders (it explains concepts and picks safe defaults) and for experienced developers (terse, technical).

## Commands

| Command | What it does |
|---|---|
| `/modsmith init` | Detects the project (or scaffolds a new one from the official template), sets up git, and writes `.modsmith/PROFILE.md` (loader, version, language, experience level…) so you're never asked twice |
| `/modsmith plan [idea]` | Turns an idea ("tiered furnaces", "a Create addon driven by RPM") into `.modsmith/DESIGN.md`: mechanics, content, dependency availability check, open design questions and a roadmap of small playable milestones, each mapped to the command that builds it. Run by `init` on new mods |
| `/modsmith study [area]` | Maps the mod's architecture into `.modsmith/STUDY.md`: entry points, registries, events, networking, persistence, mixins, key gameplay flows |
| `/modsmith audit [--scope=path] [--min=LEVEL]` | Prioritized report in `.modsmith/AUDIT.md` with **CRITICAL / HIGH / MEDIUM / LOW** findings, each with evidence, impact, fix and effort |
| `/modsmith fix <ID \| description \| crash log>` | Root-cause fix with minimal changes, save-compatibility checks and verification; updates the audit |
| `/modsmith new <kind> <name>` | Adds a complete feature (block, item, entity, block entity, menu, packet, command, config, mixin…) the idiomatic way, including models, loot, lang, tags, datagen |
| `/modsmith port <target>` | Migrates to another Minecraft version (`port 1.21.1`), another loader (`port neoforge`), both (`port neoforge@1.21.1`, done in two stages), or adds a loader (`port +fabric`, multiloader) |
| `/modsmith verify` | Build, datagen, headless dedicated-server smoke test, gametests, with an honest report |
| `/modsmith review` | Audits only your uncommitted changes before you commit |

You can also just talk normally ("my mod crashes on the server, here's the log"): the skill maps the request to the right command.

## Severity scale

- **CRITICAL**: crashes, save corruption, dedicated-server crashes, exploitable client→server trust.
- **HIGH**: desync, memory leaks, heavy per-tick work, threading bugs, incompatible mixins.
- **MEDIUM**: deprecated APIs, hardcoded values, missing datagen/translations, maintainability debt.
- **LOW**: naming, structure, docs, warnings.

## Installation

### As a Claude Code plugin (recommended)

Inside Claude Code:

```
/plugin marketplace add Carmineh/ModSmith
/plugin install modsmith@modsmith
```

Update later with `/plugin update`. Installed as a plugin, the skill's commands are namespaced: `/modsmith:modsmith audit` (or just ask in plain words, "audit my mod": and Claude picks the skill).

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
ln -s "$(pwd)/ModSmith/skills/modsmith" ~/.claude/skills/modsmith
```

Windows (PowerShell, no admin needed):

```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills\modsmith" -Target "$PWD\ClaudeMCSkill\skills\modsmith"
```

Or copy the folder into a project's `.claude/skills/` to use it only there. Restart Claude Code, then run `/modsmith` inside your mod's folder.

Requirements: Node 18+ for the heuristic scanner (`scripts/scan.mjs`; already present if you use Claude Code), a JDK matching your Minecraft version for builds.

## Repository layout

```
.claude-plugin/                 # plugin.json + marketplace.json (Claude Code plugin packaging)
skills/modsmith/
├── SKILL.md                    # entry point: commands, profile, safety rules, severity
├── references/
│   ├── commands/               # full procedure for each command
│   ├── audit/                  # severity criteria, checklist, report template
│   ├── loaders/                # NeoForge, Fabric, Forge idioms + cross-loader map
│   ├── versions/               # breaking changes between Minecraft versions
│   ├── practices/              # sides, networking, persistence, mixins, performance, compatibility
│   └── glossary.md             # plain-language definitions for beginners
├── assets/profile-template.md
└── scripts/scan.mjs            # dependency-free heuristic scanner (leads for audits)
```

## Status

Early version, focused on NeoForge/Fabric 1.20.5 to 1.21.1. Loader and version references are orientation material: the skill is instructed to verify APIs against the actual project before writing code. Contributions and corrections welcome.

## License

[MIT](LICENSE). Minecraft is a trademark of Mojang AB; this project is not affiliated with or endorsed by Mojang or Microsoft.
