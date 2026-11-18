# Fabric idioms (focus: 1.20.5 to 1.21.1)

**Parchment on Fabric** (Mojmap projects only): the Fabric template uses plain `loom.officialMojangMappings()`, which has no parameter names or javadoc. Add them by layering Parchment: `mappings loom.layered { officialMojangMappings(); parchment("org.parchmentmc.data:parchment-<mc>:<version>@zip") }`, plus the `https://maven.parchmentmc.org` repository. Take `<mc>`/`<version>` from parchmentmc.org for the project's Minecraft version (sometimes only the previous minor has data, e.g. 1.21 data for 1.21.1), never from memory. Yarn projects already have parameter names.

Fabric projects use either **Yarn** or **Mojang (Mojmap)** names: check `build.gradle` (`mappings loom.officialMojangMappings()` vs `mappings "net.fabricmc:yarn:..."`). Class and method names below are given as Yarn / Mojmap where they differ. Verify in the project's sources (`gradlew genSources`) before writing code.

## Project setup
- Fabric Loom (`fabric-loom`), Fabric Loader, Fabric API (almost always required). Java 21 for 1.20.5+.
- Metadata: `src/main/resources/fabric.mod.json`, `entrypoints` (`main`, `client`, `fabric-datagen`), `mixins`, `accessWidener`, `depends` (with `minecraft`, `fabricloader`, `fabric-api`, `java` ranges), `environment`.
- `loom { splitEnvironmentSourceSets() }` gives a separate `client` source set: the compiler then *prevents* common code from referencing client classes. Recommend it.

## Entry points
```java
public class MyMod implements ModInitializer { public void onInitialize() { ModItems.init(); ... } }
public class MyModClient implements ClientModInitializer { public void onInitializeClient() { ... } }
```
Static registry holders only register when their class is loaded: call an `init()` from `onInitialize`.

## Registration
```java
// Yarn                                              // Mojmap
Registry.register(Registries.ITEM,                   Registry.register(BuiltInRegistries.ITEM,
    Identifier.of(MODID, "thing"), new Item(...));       ResourceLocation.fromNamespaceAndPath(MODID, "thing"), new Item(...));
```
Creative tabs: add to vanilla tabs with `ItemGroupEvents.modifyEntriesEvent(key)` (`addAfter(vanillaItem, ...)` to place entries next to related ones); the mod's own tab is `FabricItemGroup.builder().title(Component.translatable("itemGroup.<modid>.<name>")).icon(...).displayItems(...).build()` registered in `BuiltInRegistries.CREATIVE_MODE_TAB` (Mojmap names). Entity attributes: `FabricDefaultAttributeRegistry.register(TYPE, attributes)`.

## Events (Fabric API callbacks)
`ServerTickEvents.END_SERVER_TICK`, `ServerTickEvents.END_WORLD_TICK`, `UseEntityCallback.EVENT`, `UseBlockCallback.EVENT`, `AttackEntityCallback.EVENT`, `ServerLivingEntityEvents.AFTER_DEATH`, `CommandRegistrationCallback.EVENT`, `ServerLifecycleEvents.*`, `LootTableEvents.MODIFY`, `BiomeModifications.addSpawn(...)`. There is no per-entity tick event: use a mixin into the entity's tick (minimal `@Inject`) or the world tick with a tracked set of entities.

## Networking (1.20.5+)
Payload record implementing `CustomPayload` (Yarn) / `CustomPacketPayload` (Mojmap) with an `Id`/`Type` and a `PacketCodec`/`StreamCodec`.
```java
PayloadTypeRegistry.playC2S().register(SetModePayload.ID, SetModePayload.CODEC);
ServerPlayNetworking.registerGlobalReceiver(SetModePayload.ID, (payload, context) -> {
    ServerPlayerEntity player = context.player();
    // validate everything (loaded, distance, bounds, permissions) before acting
});
// send: ClientPlayNetworking.send(payload); ServerPlayNetworking.send(player, payload)
```
Check the Fabric API docs for the version whether receivers run on the main thread; if unsure, wrap game-state work in `context.server().execute(...)` (server) / `context.client().execute(...)` (client).

## Data storage
- Items: data components (vanilla 1.20.5+): `Registry.register(Registries.DATA_COMPONENT_TYPE, id, ComponentType.builder().codec(CODEC).packetCodec(PACKET_CODEC).build())`.
- Entities/chunks/worlds/block entities: Fabric **Data Attachment API** (`AttachmentRegistry`, `.persistent(codec)`; may be marked experimental in your version) or Cardinal Components API (external lib).
- Item/fluid storage exposed to other mods: Fabric **Transfer API** (`ItemStorage.SIDED.registerForBlockEntity(...)`).
- World-global: vanilla `PersistentState` (Yarn) / `SavedData` (Mojmap).

## Config
No built-in config system. Common choices: a small Gson/Codec JSON file in `FabricLoader.getInstance().getConfigDir()`, or libraries (Cloth Config, YACL, owo-config, MidnightLib). Server-authoritative values must be synced to clients manually.

## Client
`EntityRendererRegistry.register`, `EntityModelLayerRegistry.registerModelLayer`, `HandledScreens.register` (Yarn) / `MenuScreens.register` (Mojmap), `KeyBindingHelper.registerKeyBinding`, `ColorProviderRegistry`, `BlockRenderLayerMap`.

## Access widener
`<modid>.accesswidener` declared in `fabric.mod.json` and `loom { accessWidenerPath = file(...) }`. Prefer it over reflection; keep it minimal.

## Datagen
`DataGeneratorEntrypoint` (`fabric-datagen` entrypoint) with `FabricDataGenerator.Pack.addProvider(...)`; providers like `FabricRecipeProvider`, `FabricModelProvider`, `FabricLanguageProvider`, `FabricBlockLootTableProvider`, `FabricTagProvider`. Task: `runDatagen`.

## Gradle tasks
`build`, `runClient`, `runServer`, `runDatagen`, `genSources`, `runGametest` (if configured).
