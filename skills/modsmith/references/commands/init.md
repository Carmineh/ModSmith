# init — set up the project and the profile

Goal: end with a working project under git and a complete `.modsmith/PROFILE.md`, asking the user as few questions as possible.

## 1. Detect the situation

Look at the current directory (or the path the user gave):

| Situation | Signals | Go to |
|---|---|---|
| Existing mod, with git | `build.gradle(.kts)` + `.git/` | §2 |
| Existing mod, no git | `build.gradle(.kts)`, no `.git/` | §2, then §4 |
| Empty / new folder | no Gradle files | §3 |
| Profile already exists | `.modsmith/PROFILE.md` | Show it, ask what changed, re-detect, update |

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
- Optional: goals for the mod (to orient future audits), target environments (client-only? server-required? both). Mention that `/modsmith plan` can turn their next ideas into a guided roadmap. If the mod has machines or custom recipes but no recipe-viewer/Jade integration, note it in the profile as a suggestion (don't add it during init).

Reply language: infer from the user's messages; don't ask. If the user has only typed slash commands so far (no natural-language text to infer from), add the reply language to the same question round.

**Someone else's mod** (the git remote/history belongs to another author, or the user says so): prefer not touching tracked files at all — offer `--out=<dir>` or, to keep `.modsmith/` in the folder, ignore it via `.git/info/exclude` (local, untracked) instead of editing the project's `.gitignore`. If nobody can answer (non-interactive run), apply the defaults from SKILL.md and mark them `(assumed)`.

## 3. New mod: scaffold from the official template

This is a **guided path**: the idea comes first, because it decides the technical choices.

**Step 1 — the idea.** Ask the user to describe the mod in 1–3 sentences, with examples so they know what's expected ("a Create addon with a block that does X depending on RPM", "furnaces in several tiers", "new crops and a cooking system"). "Skip / just the template" is a valid answer. Ask the experience level in the same round.

**Step 2 — choose platform from the idea.** Follow `plan.md` steps 2–3: restate the idea, ask only structure-changing questions, and **check required dependencies exist** for the candidate loader/version (Modrinth API or official pages). Then recommend loader and Minecraft version that satisfy them, in two sentences ("Create 6 is on NeoForge 1.21.1 but not on Fabric → NeoForge 1.21.1"). A required dependency missing for the user's preferred loader/version is a blocker: say it now, before anything is created. Without dependencies, for beginners recommend NeoForge or Fabric on the latest stable version with good docs.

**Step 2b — standard integrations.** Players expect two things from almost every content mod: a **recipe viewer** (JEI; on Fabric also REI/EMI) and a **"what am I looking at" tooltip** (Jade, the WAILA successor). Ask whether to include them, recommended answer **yes** (beginners: one sentence on what each does). Don't force them: some mods (client tweaks, libraries, server-only) don't need them. If yes:
- check each exists for the chosen loader/version (same check as Step 2); skip with a note if not;
- add them as **optional** dependencies only: API as `compileOnly`, the full mod as dev-runtime only (so the user sees them in `runClient`), `optional`/`suggests` in the metadata — the mod must load without them;
- record the choice in the profile and in `DESIGN.md` (Dependencies & integrations). No integration code is written yet: `new` adds it when content needs it (see `new.md`).

**Step 3 — identity** (with suggested defaults): mod id (lowercase, `[a-z0-9_]`, 2–64 chars), display name, package (`com.<author>.<modid>`), author, license, language (Java recommended; Kotlin only if they want it), reply/docs language.

Create the project **from the official template**, never by writing Gradle files from memory — Gradle, plugin and loader versions move fast and a hand-written build is the most common way to start broken:

- NeoForge: the official MDK repositories under github.com/NeoForgeMDKs (one per Minecraft version / Gradle plugin flavour, e.g. ModDevGradle), or the generator linked from neoforged.net.
- Fabric: the template generator at fabricmc.net/develop/template, or the `fabric-example-mod` repository matching the version.
- Forge: the MDK from files.minecraftforge.net.

Downloading requires the user's OK: say what you'll download and from where. Put the download in its own temporary folder, inspect it, then copy the template files into the project. Apply the user's mod id / package / name everywhere (properties, metadata, package directories, main class, mixin config names, assets/data namespace folders). If the download isn't possible, explain and stop rather than improvising a build.

Add the required dependencies from Step 2 to the build and metadata, taking repository URLs and version strings from the dependency's official docs/Modrinth (never from memory).

Then run `./gradlew build` (Windows: `gradlew.bat build`) once to confirm the template works. **Tell the user first that the first build downloads Minecraft and takes several minutes** (5–10 is normal), and run it in the background with progress updates, so it doesn't look stuck.

**Build environment problems** (e.g. the Gradle plugin needs a newer JDK to *run* Gradle than the mod targets): fix them **inside the project only** — Gradle 9+ daemon JVM criteria (`gradle/gradle-daemon-jvm.properties`, generated by `./gradlew updateDaemonJvm --jvm-version=<N>`), or the project's own `gradle.properties`. **Never change user-global settings** (`~/.gradle/gradle.properties`, `JAVA_HOME`, system PATH): they apply to every other project on the machine and can break builds that need an older JDK.

**Clean up** anything you created that isn't part of the project (temporary template folders, tool crash dumps such as `*.stackdump`).

**Step 4 — the plan.** If the user gave an idea, finish `plan.md` (steps 4–7): write `DESIGN.md` with the roadmap, and end by proposing milestone M1's command.

## 4. Git

- No repository → propose `git init`, a `.gitignore` for Gradle/IDE (`build/`, `.gradle/`, `run/`, `out/`, `.idea/`, `*.iml`, `.vscode/`, `bin/`), and an initial commit of the current state. To beginners, explain in one sentence why: fixes and ports need a safe way back. If they decline, continue, and remember that `port` will work on a folder copy instead of a branch.
- Never create a remote repository or push. You may mention that publishing on GitHub is an option.

## 5. Write the profile

Copy `assets/profile-template.md` to `PROFILE.md` in the modsmith directory (`--out` if given, else `.modsmith/`) and fill it. The commit-or-gitignore question applies only when that directory is inside the mod's repository. Mark anything unverified with `(?)`. Then show a short summary of the profile and suggest the next command: `study` for existing mods; for new mods the first roadmap milestone from `DESIGN.md` (or `plan` if the user skipped the idea).
