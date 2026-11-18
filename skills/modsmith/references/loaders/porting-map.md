# Loader equivalence map (1.20.5 to 1.21.x)

Use this to plan a loader port. "≈" means similar purpose but different semantics: read both loaders' docs before converting.

| Concern | NeoForge | Fabric (+ Fabric API) | Forge |
|---|---|---|---|
| Metadata | `META-INF/neoforge.mods.toml` | `fabric.mod.json` | `META-INF/mods.toml` |
| Build plugin | ModDevGradle / NeoGradle | Fabric Loom | ForgeGradle |
| Names | Mojmap (+Parchment) | Yarn or Mojmap | Mojmap (+Parchment) |
| Main entry | `@Mod` class constructor | `ModInitializer` | `@Mod` class constructor |
| Client entry | `@Mod(dist = Dist.CLIENT)` / `FMLClientSetupEvent` | `ClientModInitializer` | `FMLClientSetupEvent` |
| Registration | `DeferredRegister` (+ `.Blocks/.Items`) | `Registry.register` in init | `DeferredRegister` + `RegistryObject` |
| Creative tab contents | `BuildCreativeModeTabContentsEvent` | `ItemGroupEvents.modifyEntriesEvent` | `BuildCreativeModeTabContentsEvent` |
| Entity attributes | `EntityAttributeCreationEvent` | `FabricDefaultAttributeRegistry` | `EntityAttributeCreationEvent` |
| Natural spawns | biome modifier JSON `neoforge:add_spawns` | `BiomeModifications.addSpawn` | biome modifier JSON `forge:add_spawns` |
| Server tick | `ServerTickEvent.Post` | `ServerTickEvents.END_SERVER_TICK` | `TickEvent.ServerTickEvent` (phase END) |
| Per-entity tick | `EntityTickEvent.Post` | none (mixin into `tick`) | `LivingEvent.LivingTickEvent` (living only) |
| Right-click entity | `PlayerInteractEvent.EntityInteract` | `UseEntityCallback` | `PlayerInteractEvent.EntityInteract` |
| Commands | `RegisterCommandsEvent` | `CommandRegistrationCallback` | `RegisterCommandsEvent` |
| Loot changes | Global loot modifiers | `LootTableEvents.MODIFY` | Global loot modifiers |
| Networking | `RegisterPayloadHandlersEvent` + `PayloadRegistrar` | `PayloadTypeRegistry` + `Server/ClientPlayNetworking` | `ChannelBuilder` SimpleChannel |
| Item stack data | data components (vanilla) | data components (vanilla) | data components (vanilla) |
| Entity/BE/chunk extra data | Data Attachments | Data Attachment API / Cardinal Components | Capabilities |
| Exposed inventories | `Capabilities.ItemHandler.BLOCK` | Transfer API `ItemStorage.SIDED` | `ForgeCapabilities.ITEM_HANDLER` |
| Config | `ModConfigSpec` | library or custom JSON | `ForgeConfigSpec` |
| Access to private members | Access Transformer (`accesstransformer.cfg`) | Access Widener | Access Transformer |
| Datagen | `GatherDataEvent`, `runData` | `DataGeneratorEntrypoint`, `runDatagen` | `GatherDataEvent`, `runData` |
| Common tags | `c:` (NeoForge `Tags`) | `c:` (`ConventionalItemTags`) | `forge:` (older) / check version |
| Mixins | supported (config in mods.toml `[[mixins]]`) | first-class | supported |

## Porting notes
- **Mojmap ↔ Yarn**: porting a Yarn Fabric mod to NeoForge means renaming nearly every Minecraft class/method. Do it with the IDE/migration tools where possible, not by hand. Fabric projects can switch to Mojmap first (Loom supports migrating mappings: `migrateMappings` task), a good first step that separates "rename" from "API change".
- **Events ↔ callbacks/mixins**: Fabric has fewer events; some NeoForge events map to a mixin on Fabric, and some Fabric mixins can become events on NeoForge (removing a mixin is a win: note it).
- **Config**: moving to NeoForge means adopting `ModConfigSpec`; keep option names and defaults identical so users' expectations stay the same (the file format/location will change: mention it in the changelog).
- **Persistence keys**: keep the same component/attachment ids and NBT keys so worlds survive, but a loader change generally means a world can't be moved between loaders anyway; say so explicitly to the user.
- **Multiloader (`+loader`)**: structure `common/` (vanilla-only code, Mojmap), `neoforge/`, `fabric/`; platform differences behind a small service interface loaded with `ServiceLoader` (MultiLoader-Template style) or Architectury's `@ExpectPlatform`. Start from the official MultiLoader-Template or Architectury template rather than restructuring by hand.
