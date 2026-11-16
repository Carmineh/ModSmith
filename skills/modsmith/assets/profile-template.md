# Modsmith profile
_Created by `/modsmith init` on <date>. Edit freely; modsmith re-checks it against the build files on every run._

## Mod
- **Name:** <display name>
- **Mod id:** <modid>
- **Base package:** <com.author.modid>
- **Version:** <mod_version>
- **Description:** <one line, what the mod does>

## Platform
- **Loader:** <neoforge | fabric | forge | multiloader (list)>
- **Loader version:** <e.g. 21.1.x>
- **Minecraft version:** <e.g. 1.21.1>
- **Java:** <21>
- **Language:** <java | kotlin>
- **Mappings:** <mojmap (+parchment) | yarn>
- **Build plugin:** <moddevgradle | neogradle | loom | forgegradle | architectury>

## Dependencies
| Mod | Required? | Version range | Notes |
|---|---|---|---|

**Soft integrations** (detected at runtime, not declared): <e.g. Create, Mekanism via ModList.isLoaded — what they change>

## Project structure
- **Client code isolation:** <separate package | split source set | mixed (?)>
- **Mixins:** <none | config files>
- **Access transformer / widener:** <path | none>
- **Datagen:** <yes (task) | no> — generated: <loot, tags, recipes…>; hand-written: <models, blockstates, lang…>
- **Gametests:** <yes | no>
- **CI:** <.github/workflows/... | none>

## User
- **Experience:** <beginner | intermediate | expert>
- **Reply language:** <it | en | ...>
- **Docs language:** <en (default) | ...>
- **modsmith directory:** <.modsmith (default) | path>  — committed to git? <yes | gitignored>
- **Goals / notes:** <e.g. "keep 1.21.1, prepare for multiplayer servers">

## Conventions
<observed conventions to keep consistent: registry class names, package layout, naming of ids, code style>

## Git
- **Repository:** <yes | no>
- **Default branch:** <e.g. main, mc1.21.1/dev>
- **Current branch at last run:** <branch> @ <short sha>
