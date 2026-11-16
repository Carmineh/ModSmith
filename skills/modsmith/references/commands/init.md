# init — set up the project and the profile

Goal: end with a working project under git and a complete `.modsmith/profile.md`, asking the user as few questions as possible.

## 1. Detect the situation

Look at the current directory (or the path the user gave):

| Situation | Signals | Go to |
|---|---|---|
| Existing mod, with git | `build.gradle(.kts)` + `.git/` | §2 |
| Existing mod, no git | `build.gradle(.kts)`, no `.git/` | §2, then §4 |
| Empty / new folder | no Gradle files | §3 |
| Profile already exists | `.modsmith/profile.md` | Show it, ask what changed, re-detect, update |

If the folder contains something that isn't a mod (or several mods), ask before doing anything.

## 2. Existing mod: detect, then ask only what's missing

Read, in this order, and fill the profile from what you find:

- `gradle.properties` — `minecraft_version`, `neo_version` / `loader_version` / `forge_version`, `mod_id`, `mod_name`, `mod_version`, `mod_group_id`, `parchment_*`, `mapping_*`.
- `build.gradle(.kts)` + `settings.gradle` — Gradle plugin (`net.neoforged.moddev`, `net.neoforged.gradle.userdev`, `fabric-loom`, `net.minecraftforge.gradle`, `dev.architectury.loom`), Java toolchain, subprojects (multiloader?), dependencies, mappings (`mappings loom.officialMojangMappings()` vs Yarn), Kotlin plugin.
- Metadata — `src/main/resources/META-INF/neoforge.mods.toml`, `src/main/templates/META-INF/neoforge.mods.toml` (NeoForge MDK expands templates), `META-INF/mods.toml` (Forge / old NeoForge), `fabric.mod.json`.
- Source layout — language (`src/main/java` vs `src/main/kotlin`), base package, whether client code is in a separate package or source set, mixin configs (`*.mixins.json`), access transformer / access widener files, presence of datagen (`src/generated/`), gametests.
- Git, read-only: `git --no-optional-locks status --short`, `git rev-parse --abbrev-ref HEAD` (current branch), `git rev-parse --short HEAD` (commit for report headers), default branch from `git symbolic-ref refs/remotes/origin/HEAD` if a remote exists. `--no-optional-locks` keeps `status` from rewriting the index, so read-only commands really are read-only.

Then ask the user (one compact message, with your detected values as defaults so they can just confirm):

- **Experience level** (beginner / intermediate / expert) — always ask; it can't be detected.
- **Docs language** — English by default (shareable); offer the user's language as the alternative.
- **modsmith directory** — `.modsmith/` committed (recommended for own mods), `.modsmith/` gitignored, or an external folder (read-only use).
- Anything you couldn't detect or that looks inconsistent.
- Optional: goals for the mod (to orient future audits), target environments (client-only? server-required? both).

Reply language: infer from the user's messages; don't ask. If the user has only typed slash commands so far (no natural-language text to infer from), add the reply language to the same question round.

**Someone else's mod** (the git remote/history belongs to another author, or the user says so): prefer not touching tracked files at all — offer `--out=<dir>` or, to keep `.modsmith/` in the folder, ignore it via `.git/info/exclude` (local, untracked) instead of editing the project's `.gitignore`. If nobody can answer (non-interactive run), apply the defaults from SKILL.md and mark them `(assumed)`.

## 3. New mod: scaffold from the official template

Ask (with suggested defaults): loader, Minecraft version, language (Java recommended; Kotlin only if they want it), mod id (lowercase, `[a-z0-9_]`, 2–64 chars), display name, package (`com.<author>.<modid>`), author, license, experience level.

For beginners, recommend NeoForge or Fabric on the latest stable version that has good docs; explain the choice in two sentences, don't lecture.

Create the project **from the official template**, never by writing Gradle files from memory — Gradle, plugin and loader versions move fast and a hand-written build is the most common way to start broken:

- NeoForge: the official MDK repositories under github.com/NeoForgeMDKs (one per Minecraft version / Gradle plugin flavour, e.g. ModDevGradle), or the generator linked from neoforged.net.
- Fabric: the template generator at fabricmc.net/develop/template, or the `fabric-example-mod` repository matching the version.
- Forge: the MDK from files.minecraftforge.net.

Downloading requires the user's OK: say what you'll download and from where. Put the download in its own temporary folder, inspect it, then copy the template files into the project. Apply the user's mod id / package / name everywhere (properties, metadata, package directories, main class, mixin config names, assets/data namespace folders). If the download isn't possible, explain and stop rather than improvising a build.

Then run `./gradlew build` (Windows: `gradlew.bat build`) once to confirm the template works.

## 4. Git

- No repository → propose `git init`, a `.gitignore` for Gradle/IDE (`build/`, `.gradle/`, `run/`, `out/`, `.idea/`, `*.iml`, `.vscode/`, `bin/`), and an initial commit of the current state. To beginners, explain in one sentence why: fixes and ports need a safe way back. If they decline, continue, and remember that `port` will work on a folder copy instead of a branch.
- Never create a remote repository or push. You may mention that publishing on GitHub is an option.

## 5. Write the profile

Copy `assets/profile-template.md` to `profile.md` in the modsmith directory (`--out` if given, else `.modsmith/`) and fill it. The commit-or-gitignore question applies only when that directory is inside the mod's repository. Mark anything unverified with `(?)`. Then show a short summary of the profile and suggest the next command (`study` for existing mods, `new` for new ones).
