# Audit checklist

Go area by area. Skip areas the mod doesn't have. For the correct idiom in each area, see `references/practices/` and `references/loaders/`.

## 1. Build & metadata
- [ ] Java toolchain matches the Minecraft version (Java 21 for 1.20.5+, 17 for 1.18–1.20.4).
- [ ] Mod id consistent across properties, metadata, `@Mod`/entrypoints, assets/data namespaces, mixin config names.
- [ ] Dependencies declared in metadata with sensible version ranges (and `side`/`environment` where relevant); optional integrations really optional (no hard class references).
- [ ] No leftover MDK/template content (example blocks, `examplemod`, template description/authors).
- [ ] License present and consistent with metadata.
- [ ] The build doesn't depend on user-global configuration (`~/.gradle/gradle.properties`, a specific `JAVA_HOME`): a fresh clone on another machine must build. Requirements such as "Gradle must run on JDK N" live in the project (daemon JVM criteria, README).
- [ ] `.gitignore` excludes `build/`, `run/`, `.gradle/`, IDE files; no binaries/jars committed accidentally.

## 2. Sides (client vs server)
- [ ] No `net.minecraft.client.*` (or loader client packages) referenced from classes that load on a dedicated server.
- [ ] Client registration (renderers, screens, key mappings, colors, particles providers) in client-only entry points.
- [ ] Game logic runs on the logical server (`!level.isClientSide()`); client side only predicts/visualizes.
- [ ] No static mutable state shared between logical client and server in singleplayer.
See `practices/sides.md`.

## 3. Registration
- [ ] Registration is unconditional: no `if (ModList.isLoaded(...)) register(...)`. What a mod registers must not depend on which other mods are installed (registry mismatch between client and server, items vanishing from worlds when a pack changes). Hide or disable content instead.
- [ ] A mod that adds blocks/items has its **own creative tab** containing all of them (translated title, own icon), and they also appear in the fitting vanilla tabs. Obtainable items missing from every tab are MEDIUM (players can't find them); a missing mod tab is LOW–MEDIUM. Debug/test items in public tabs → question for the author.
- [ ] Every registered item has a model and every model references existing textures/fluids (no purple-black items, no orphan files). Prefer datagen for models so they follow registration.
- [ ] Everything registered through the loader's registry mechanism at the right time (DeferredRegister / `Registry.register` in initializer) — no `new Block(...)` outside registration, no registry access before registries are populated.
- [ ] Registry names lowercase, stable, namespaced with mod id.
- [ ] Every block has a block item (if obtainable), loot table, model/blockstate, lang key, mining tags; every item has model + lang; creative tab entries.

## 4. Networking
- [ ] Every client→server payload validated on the server: sender exists, has permission, is in range of the target, values bounded, referenced entity/block exists and is loaded, inventory/menu state matches.
- [ ] Handlers run game logic on the main thread (`enqueueWork` / `context.server().execute` / client equivalents).
- [ ] Codecs symmetric (read = write); size limits on strings/lists.
- [ ] No sending every tick when state hasn't changed; send only to tracking players, not to all.
See `practices/networking.md`.

## 5. Persistence & data
- [ ] Save keys stable and namespaced; load is tolerant of missing/old keys.
- [ ] Block entities call `setChanged()` after modifying saved state; sync to client when the client renders that state.
- [ ] Per-stack data via data components (1.20.5+), per-entity/chunk/level data via attachments/SavedData (NeoForge) or the appropriate Fabric API — not via fragile static maps.
- [ ] Resource folders use the correct names for the version (1.21+: `recipe/`, `loot_table/`, `tags/block/`, `tags/item/`, `advancement/`…).
- [ ] Datagen present and up to date if used; generated files committed consistently.
See `practices/persistence.md`.

## 6. Events & game logic
- [ ] Event handlers registered on the correct bus (mod bus vs game bus on NeoForge/Forge) — a handler on the wrong bus silently never fires.
- [ ] Handlers check side and cheap conditions first (early return).
- [ ] Cancelling/modifying events only when intended; no assumptions that other mods won't touch the same event.
- [ ] Entity/player references not held beyond their lifetime (store UUIDs, resolve when needed).

## 6b. Game logic & data-driven content
Technical checks miss most real bugs in content mods. For each core mechanic in STUDY.md, ask:
- [ ] **Documented = implemented.** Every feature, config option, JSON field or script parameter mentioned in README/docs/KubeJS bindings is actually read somewhere in game logic (grep the accessor). Parsed-but-unused fields are HIGH when users rely on them.
- [ ] **Data matches code.** The mod's own JSON files (custom data folders such as `data/<modid>/<thing>/`) use exactly the keys the codec declares. Unknown keys are silently ignored by Mojang codecs, so a typo falls back to the default with no error. Check every file, not one sample.
- [ ] **Timers and cooldowns progress.** Every counter written (cooldown, timer, age, progress) has a code path that decrements it or compares it to game time — including counters stored on items, which never tick on their own.
- [ ] **Random outcomes decided once.** A result checked in one place (`canCraft`) and re-rolled in another (`craft`) can produce a different, unchecked result (check-then-act). Insertion into output must use the actual result and handle "doesn't fit".
- [ ] **Round-trips preserve state.** Entity → item → entity (capture/release, buckets, pickup), block → item → block (silk touch, wrench): age, health, cooldowns, owner, custom data survive, or loss is intentional.
- [ ] **Validation of loaded data.** Invalid entries are rejected **with a log line naming the file and reason**; ranges are validated (`Codec.intRange`, `doubleRange`).
- [ ] **Progression is reachable.** Follow the crafting/upgrade chain end to end: every step has a loadable recipe, every block drops itself (or its intended loot), recipe-unlock advancements trigger at a sensible moment. One broken link blocks everything after it.
- [ ] **Material consistency** (usually a question for the author): tiers/materials behave like their vanilla counterparts where players expect it (hardness, tool level, fire resistance of netherite items, stack size).
- [ ] **Balance-critical values** (yields, chances, costs) come from data/config, not magic numbers scattered in code.
- [ ] **Player feedback** is translatable (`Component.translatable`), not hard-coded English.

## 7. Performance
- [ ] Tick methods (entity, block entity, level/server tick events) do minimal work; expensive work is throttled (`gameTime % N`), cached, or event-driven.
- [ ] No world scans or large-AABB entity queries every tick; no per-tick allocation of big collections; no logging in tick paths.
- [ ] No blocking I/O or `Thread.sleep` on the main/render thread.
- [ ] Nothing that changes every tick is synced every tick: `SynchedEntityData.set` in `tick`/`aiStep` with a changing value, `level.sendBlockUpdated` from `onContentsChanged`/`onEnergyChanged` of handlers that are filled/drained each tick by pipes, cables or generators.
- [ ] Neighbour capability lookups in tick use `BlockCapabilityCache` (NeoForge) or are throttled.
See `practices/performance.md`.

## 8. Mixins & access
- [ ] Each mixin is justified (no event/API alternative), minimal, and uses the least invasive injection.
- [ ] No `@Overwrite`; `@Redirect` only when unavoidable; MixinExtras preferred where available.
- [ ] Client-only mixins in the `client` list; `required`/`require` set appropriately; refmap/mapping setup correct.
- [ ] Access transformers / wideners minimal and actually used.
See `practices/mixins.md`.

## 9. Config
- [ ] Right config type (client / common / server-per-world), and each spec registered **once**.
- [ ] Values validated with ranges; comments present.
- [ ] Config not read during static init or before loaded; values read where used (or cached and refreshed on reload event).

## 10. Compatibility & robustness
- [ ] Uses tags (incl. common `c:` tags) instead of hardcoded item checks where other mods' items should count.
- [ ] Optional integrations isolated (separate class loaded only if the other mod is present).
- [ ] No catching-and-ignoring exceptions; errors logged with the mod's logger and context.
See `practices/compatibility.md`.

## 11. Code quality
- [ ] Clear package structure (registry, block, item, entity, client, network, data, config, mixin…).
- [ ] No god classes / copy-pasted variants that should be parameterized.
- [ ] Constants named; no magic numbers in game logic.
- [ ] Logging through a logger (`LogUtils.getLogger()` / SLF4J), not `System.out`.
- [ ] README explains what the mod does, versions, dependencies, how to build.

## 12. Tests & tooling
- [ ] Builds cleanly from a fresh clone.
- [ ] Gametests for core mechanics (nice to have; LOW if missing, unless the mod is complex).
- [ ] CI builds the mod (if the repo has `.github/workflows`, check it targets the right Java version).
