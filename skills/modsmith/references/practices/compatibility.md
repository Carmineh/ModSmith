# Compatibility & robustness

Players run your mod next to hundreds of others. Good citizenship:

- **Tags over hardcoded items.** `stack.is(ItemTags.X)` / common `c:` tags (e.g. `c:ingots/iron`) instead of `stack.is(Items.IRON_INGOT)` when "any equivalent item" should work. Define your own tags for your mechanics so packs can extend them.
- **Data-driven over code-driven.** Recipes, loot, spawns, values tunable via datapacks/config let modpack authors adapt your mod without forking it.
- **Optional integrations are isolated.** Code touching another mod's classes lives in a separate class that's only loaded when `ModList.get().isLoaded("othermod")` (NeoForge) / `FabricLoader.getInstance().isModLoaded(...)` is true. A direct reference in common code = crash when that mod is absent.
- **Standard integrations: recipe viewer + Jade.** Most content mods should support a recipe viewer (JEI on NeoForge/Forge; JEI, REI or EMI on Fabric) and Jade (WAILA successor). Rules:
  - always **optional**: API `compileOnly`, full mod only in the dev runtime, declared optional in the metadata; the mod must start and work on a dedicated server without them;
  - one package per integration (`compat/jei`, `compat/jade`), discovered through the integration's own plugin mechanism (annotation or entrypoint) so no common class references it;
  - recipe-viewer plugins are client-side; Jade has a server part (data provider, runs on the server and sends only what the tooltip needs) and a client part (component provider);
  - take the Maven coordinates, repository and plugin registration from the integration's official docs for the exact loader/version: these APIs change between major versions;
  - show the same numbers the game uses (read them from the same recipe/definition objects, don't duplicate constants).
- **Don't break other mods' expectations.** Don't cancel common events broadly; respect `isCanceled`; don't replace vanilla registry entries; avoid `@Overwrite`.
- **Expose your inventories** through the loader's standard API (capabilities / Transfer API) so pipes and automation mods work.
- **Fail loudly and helpfully.** Log errors with context through the mod's logger; never `catch (Exception e) {}`. Don't crash the game for recoverable data problems: log and use defaults.
- **Stable identifiers.** Registry names, config keys, tag names, packet ids are API for packs and other mods.
