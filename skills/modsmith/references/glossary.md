# Glossary (plain language, for beginners)

When explaining to a beginner, translate these into the user's language and keep the English term in parentheses the first time.

- **Mod loader** — the program that loads mods into Minecraft (NeoForge, Fabric, Forge). Mods are written for a specific loader and Minecraft version.
- **MDK / template** — the official starter project for a loader.
- **Gradle** — the build tool: downloads Minecraft and the loader, compiles the mod, runs the game for testing (`gradlew runClient`).
- **Mappings** — the names used for Minecraft's code (the original is obfuscated). Mojang mappings ("Mojmap") and Yarn are two naming sets; the same thing can have different names.
- **Registry / registering** — telling the game "this block/item/entity exists, with this id". Everything a mod adds must be registered at the right moment.
- **Resource location / id** — the name of something, like `mymod:magic_cow` (namespace `mymod`, path `magic_cow`).
- **Client / server (sides)** — the client draws the game and reads your input; the server runs the rules and saves the world. In singleplayer both run inside your game. Code meant for one side can crash or misbehave on the other.
- **Dedicated server** — a server without graphics, as used in multiplayer. Client-only code doesn't exist there.
- **Tick** — one step of the game; 20 per second. Code that runs "every tick" must be very fast.
- **Event** — a notification the loader sends ("a player right-clicked an entity"); mods subscribe to react.
- **Event bus** — the channel events are sent on. NeoForge/Forge have two (mod bus for setup, game bus for gameplay); using the wrong one means the handler never runs.
- **Block entity** — extra data and logic attached to a block (chests, furnaces).
- **Blockstate** — the small set of properties of a block (facing, lit, age).
- **NBT** — Minecraft's save format (a tree of named values).
- **Data component** — since 1.20.5, how extra data is stored on items (replaced item NBT).
- **Attachment / capability** — ways to store extra data on entities, block entities, chunks, or to expose things like inventories to other mods.
- **Packet / payload** — a message sent between client and server.
- **Mixin** — a technique to modify Minecraft's own code. Powerful but fragile; used only when there's no other way.
- **Access transformer / widener** — a file that makes private parts of Minecraft accessible to the mod.
- **Datagen** — code that generates the mod's JSON files (recipes, models, translations) automatically, avoiding typos.
- **Datapack / data folder** — JSON files in `data/` defining recipes, loot tables, tags, etc.
- **Assets / resource pack** — files in `assets/`: textures, models, sounds, translations (client side).
- **Tag** — a named group (e.g. "all logs"), so mods and packs can refer to many items/blocks at once.
- **Loot table** — defines what a block, entity or chest drops.
- **Lang file** — `assets/<modid>/lang/en_us.json`, the translations of names and texts.
- **Gametest** — automated in-game tests run by a test server.
- **Crash report** — the file Minecraft writes in `crash-reports/` when it crashes; the "Caused by" lines and the frames from the mod's package point to the problem.
