# NeoForge idioms (focus: 1.20.5 to 1.21.1)

APIs change between NeoForge versions. Treat this file as orientation, then confirm names against the project's decompiled sources (in IntelliJ: navigate to the class; or check the NeoForge docs at docs.neoforged.net for the matching version) before writing code. Newer versions (1.21.2+) changed several of these: see `versions/breaking-changes.md`.

## Contents
1. Project setup · 2. Entry points & buses · 3. Registration · 4. Events · 5. Networking · 6. Data: components, attachments, capabilities · 7. Config · 8. Client · 9. Datagen · 10. Gradle tasks

## 1. Project setup
- Gradle plugin: ModDevGradle (`net.neoforged.moddev`, recommended by the MDK) or NeoGradle (`net.neoforged.gradle.userdev`). Mojang mappings + Parchment for parameter names and javadoc (the MDK enables it: `parchment { mappingsVersion; minecraftVersion }` in `build.gradle`, versions in `gradle.properties`; if missing, take the versions from parchmentmc.org).
- Metadata: `META-INF/neoforge.mods.toml` (1.20.5+; before that `mods.toml`). The MDK keeps it in `src/main/templates/` and expands `${mod_id}` etc. from `gradle.properties`.
- Java 21.

## 2. Entry points & buses
```java
@Mod(MyMod.MODID)
public class MyMod {
    public static final String MODID = "mymod";
    public MyMod(IEventBus modEventBus, ModContainer modContainer) {
        ModBlocks.BLOCKS.register(modEventBus);
        ModItems.ITEMS.register(modEventBus);
        modContainer.registerConfig(ModConfig.Type.COMMON, Config.SPEC);
    }
}

@Mod(value = MyMod.MODID, dist = Dist.CLIENT)   // client-only entry point
public class MyModClient { public MyModClient(IEventBus modEventBus, ModContainer container) { ... } }
```
Two buses: putting a handler on the wrong one means it **silently never fires**:
- **Mod bus** (`modEventBus`, or an `@EventBusSubscriber(modid = MODID)` class: see the bus-routing note below): lifecycle and registration, `FMLCommonSetupEvent`, `FMLClientSetupEvent`, `RegisterPayloadHandlersEvent`, `EntityAttributeCreationEvent`, `RegisterSpawnPlacementsEvent`, `BuildCreativeModeTabContentsEvent`, `RegisterCapabilitiesEvent`, `GatherDataEvent`, `EntityRenderersEvent.*`, `RegisterMenuScreensEvent`, `ModConfigEvent`.
- **Game bus** (`NeoForge.EVENT_BUS`, or `@EventBusSubscriber(modid = MODID)` with default bus GAME): gameplay, `PlayerInteractEvent.*`, `EntityTickEvent.Pre/Post`, `ServerTickEvent.Pre/Post`, `LevelTickEvent.Pre/Post`, `LivingDeathEvent`, `LivingDropsEvent`, `RegisterCommandsEvent`, `EntityJoinLevelEvent`, `ServerStartingEvent`.
- `@EventBusSubscriber(value = Dist.CLIENT, ...)` for client-only subscriber classes.
- **Bus routing in `@EventBusSubscriber`:** older code passes `bus = EventBusSubscriber.Bus.MOD`. In NeoForge 21.1 (FML 4.x) the `bus` attribute is deprecated for removal and events implementing `IModBusEvent` are routed to the mod bus automatically: so omit `bus` in new code, and don't report its absence as a bug. Check `EventBusSubscriber` in the project's FML jar (see `api-lookup.md`) for older or newer versions.

## 3. Registration
```java
public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(MODID);
public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(MODID);
public static final DeferredBlock<Block> MY_BLOCK =
    BLOCKS.registerSimpleBlock("my_block", BlockBehaviour.Properties.of().strength(2f));
public static final DeferredItem<BlockItem> MY_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(MY_BLOCK);

public static final DeferredRegister<BlockEntityType<?>> BLOCK_ENTITIES =
    DeferredRegister.create(Registries.BLOCK_ENTITY_TYPE, MODID);
public static final DeferredRegister<CreativeModeTab> TABS =
    DeferredRegister.create(Registries.CREATIVE_MODE_TAB, MODID);
```
- Creative tabs: the mod's own tab is a `CreativeModeTab.builder().title(Component.translatable("itemGroup.<modid>.<name>")).icon(...).displayItems((params, output) -> ...).build()` registered through the `TABS` register; entries for vanilla tabs are added in `BuildCreativeModeTabContentsEvent` (mod bus) with `event.insertAfter(...)`/`event.accept(...)`.
- Use `ResourceLocation.fromNamespaceAndPath(MODID, "path")` / `ResourceLocation.parse("ns:path")` (constructor is private since 1.21).
- Access registered objects via the `DeferredHolder` (`.get()`) only after registration: never in static initializers of other registries' values.

## 4. Events: common patterns
- Entity interaction: `PlayerInteractEvent.EntityInteract` (fires on both sides! check `event.getLevel().isClientSide()`; set `event.setCancellationResult(InteractionResult.SUCCESS)` + `setCanceled(true)` when consumed).
- Per-entity ticking of vanilla entities: `EntityTickEvent.Post`, runs for **every** entity every tick; filter by type first (`if (!(event.getEntity() instanceof Cow cow)) return;`) and on side, then throttle.
- Drops: `LivingDropsEvent`; loot changes preferably via global loot modifiers (`data/<modid>/neoforge/loot_modifiers/`).
- Spawns: biome modifiers JSON (`data/<modid>/neoforge/biome_modifier/*.json`, type `neoforge:add_spawns`).

## 5. Networking (1.20.5+)
```java
public record SetModePayload(BlockPos pos, int mode) implements CustomPacketPayload {
    public static final Type<SetModePayload> TYPE =
        new Type<>(ResourceLocation.fromNamespaceAndPath(MODID, "set_mode"));
    public static final StreamCodec<RegistryFriendlyByteBuf, SetModePayload> STREAM_CODEC =
        StreamCodec.composite(BlockPos.STREAM_CODEC, SetModePayload::pos,
                              ByteBufCodecs.VAR_INT, SetModePayload::mode, SetModePayload::new);
    @Override public Type<? extends CustomPacketPayload> type() { return TYPE; }
}

@SubscribeEvent // mod bus
static void register(RegisterPayloadHandlersEvent event) {
    PayloadRegistrar r = event.registrar("1");
    r.playToServer(SetModePayload.TYPE, SetModePayload.STREAM_CODEC, ServerHandlers::setMode);
}

static void setMode(SetModePayload p, IPayloadContext ctx) {
    ctx.enqueueWork(() -> {               // harmless if already on main thread
        if (!(ctx.player() instanceof ServerPlayer sp)) return;
        Level level = sp.level();
        if (!level.isLoaded(p.pos())) return;
        if (sp.distanceToSqr(Vec3.atCenterOf(p.pos())) > 64) return;   // reach check
        if (p.mode() < 0 || p.mode() >= MAX_MODES) return;              // bounds
        // ... now act
    });
}
```
Sending: `PacketDistributor.sendToServer(payload)`, `sendToPlayer(serverPlayer, payload)`, `sendToPlayersTrackingEntity(entity, payload)`, `sendToPlayersTrackingChunk(level, chunkPos, payload)`.
Check the registrar for `executesOn(HandlerThread.NETWORK)`; if present, the handler is off-thread and must `enqueueWork` for game state.

## 6. Data storage
- **Item data** → data components: `DeferredRegister.DataComponents` (`DeferredRegister.createDataComponents(...)`: check the exact factory signature in your version) with `DataComponentType.builder().persistent(CODEC).networkSynchronized(STREAM_CODEC)`; read `stack.get(TYPE)`, write `stack.set(TYPE, value)`. Component values must be immutable (records), with proper `equals`/`hashCode`.
- **Entity / block entity / chunk / level extra data** → data attachments: `DeferredRegister.create(NeoForgeRegistries.ATTACHMENT_TYPES, MODID)`, `AttachmentType.builder(() -> default).serialize(CODEC)` (+ `.copyOnDeath()` for players). `entity.getData(TYPE)`, `entity.setData(TYPE, v)`. In 1.21.1 attachments are **not** synced to clients automatically: send a payload if the client needs them.
- **Block entity save**: `saveAdditional(CompoundTag, HolderLookup.Provider)` / `loadAdditional(...)`; client sync via `getUpdateTag(Provider)` + `getUpdatePacket()` returning `ClientboundBlockEntityDataPacket.create(this)`; call `setChanged()` and `level.sendBlockUpdated(...)` when synced state changes.
- **Capabilities** (item/fluid/energy handlers exposed to other mods): `RegisterCapabilitiesEvent` → `event.registerBlockEntity(Capabilities.ItemHandler.BLOCK, TYPE, (be, side) -> be.getItemHandler(side))`.
- **World-global data**: `SavedData` via `serverLevel.getDataStorage().computeIfAbsent(...)`; call `setDirty()`.

**Menu data sync (`ContainerData`)**: vanilla's `ClientboundContainerSetDataPacket` writes 16-bit values, but NeoForge 1.21.1 patches `ServerPlayer`'s menu listener to send `AdvancedContainerSetDataPayload` with the full `int` when the client has NeoForge (verified in the 21.1.265 sources, `ServerPlayer.sendDataChange`). So on NeoForge, values above 32767 (energy, XP, progress) sync correctly and need no 16-bit cap. On Fabric/vanilla the 16-bit limit is real.

## 7. Config
```java
public class Config {
    private static final ModConfigSpec.Builder B = new ModConfigSpec.Builder();
    public static final ModConfigSpec.IntValue INTERVAL = B.comment("Ticks between drops")
        .defineInRange("interval", 6000, 20, 1_000_000);
    public static final ModConfigSpec SPEC = B.build();
}
```
Register with `modContainer.registerConfig(ModConfig.Type.SERVER | COMMON | CLIENT, SPEC)`. Read with `INTERVAL.get()` only after load (not in static init / registry construction). SERVER configs are per-world and synced to clients. In-game config screen (client): `container.registerExtensionPoint(IConfigScreenFactory.class, ConfigurationScreen::new)`.

## 8. Client
Renderers: `EntityRenderersEvent.RegisterRenderers` / `RegisterLayerDefinitions`; screens: `RegisterMenuScreensEvent`; keybinds: `RegisterKeyMappingsEvent`; item/block colors: `RegisterColorHandlersEvent`. All in client-only classes.

## 9. Datagen (≤ 1.21.3)
`GatherDataEvent` (mod bus): `event.getGenerator().addProvider(event.includeServer(), new ModRecipeProvider(event.getGenerator().getPackOutput(), event.getLookupProvider()))`; client providers (`BlockStateProvider`, `ItemModelProvider`, `LanguageProvider`) with `event.includeClient()`. Output in `src/generated/resources`, which must be in the resources source set. Task: `runData`.

## 10. Gradle tasks (ModDevGradle)
`build`, `runClient`, `runServer`, `runData`, `runGameTestServer`. Run dirs default to `run/`.
