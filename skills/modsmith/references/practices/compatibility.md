# Compatibility & robustness

Players run your mod next to hundreds of others. Good citizenship:

- **Tags over hardcoded items.** `stack.is(ItemTags.X)` / common `c:` tags (e.g. `c:ingots/iron`) instead of `stack.is(Items.IRON_INGOT)` when "any equivalent item" should work. Define your own tags for your mechanics so packs can extend them.
- **Data-driven over code-driven.** Recipes, loot, spawns, values tunable via datapacks/config let modpack authors adapt your mod without forking it.
- **Optional integrations are isolated.** Code touching another mod's classes lives in a separate class that's only loaded when `ModList.get().isLoaded("othermod")` (NeoForge) / `FabricLoader.getInstance().isModLoaded(...)` is true. A direct reference in common code = crash when that mod is absent.
- **Don't break other mods' expectations.** Don't cancel common events broadly; respect `isCanceled`; don't replace vanilla registry entries; avoid `@Overwrite`.
- **Expose your inventories** through the loader's standard API (capabilities / Transfer API) so pipes and automation mods work.
- **Fail loudly and helpfully.** Log errors with context through the mod's logger; never `catch (Exception e) {}`. Don't crash the game for recoverable data problems — log and use defaults.
- **Stable identifiers.** Registry names, config keys, tag names, packet ids are API for packs and other mods.
