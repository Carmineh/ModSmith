# Changelog

All notable changes to Modsmith. Versions follow [Semantic Versioning](https://semver.org/); the version in `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` must match the release tag.

## 0.1.0 (unreleased)

First public version.

### Commands
- `init`: detects existing projects or creates new ones from the official NeoForge/Fabric/Forge templates, starting from the user's idea (loader and version chosen from the mods the idea depends on); profile in `.modsmith/PROFILE.md`; optional recipe viewer and Jade integrations; Parchment suggested for Mojang-mapped 1.21.x projects; commit policy (`auto`, `propose`, `ask`); optional GitHub build and publish workflow.
- `plan`: turns an idea into `DESIGN.md` with mechanics, content, dependency checks, open design questions and a roadmap of playable milestones.
- `study`, `audit`, `fix`, `new`, `port`, `verify`, `review`: the full maintenance cycle, with a shared CRITICAL/HIGH/MEDIUM/LOW scale, questions for the author when something may be intentional, backups or git before every change, save-compatibility rules and honest verification.

### Scanner
- Dependency-free Node scanner split into `lib/` and `checks/`, aware of multiloader projects; checks for side leaks, data keys no codec reads, 1.21 folder names, unknown ids in loot tables and recipes, per-tick sync, config registered twice, conditional registration, risky or misplaced mixins, model/texture mismatches.
- 19 automatic tests (`npm test`).

### Packaging
- Claude Code plugin and marketplace, Codex plugin and marketplace, `install.sh` / `install.ps1` for linked installs, CI (tests on Linux, Windows, macOS; skill lint) and release workflow.
