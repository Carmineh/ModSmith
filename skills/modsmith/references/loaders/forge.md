# Forge (MinecraftForge) idioms

Forge and NeoForge share history (NeoForge forked in 2023) and look alike, but diverged from 1.20.2 on: networking, capabilities, registration helpers and event names differ. Never assume NeoForge code works on Forge or vice versa. Verify against the project's sources and the Forge docs for the matching version (docs.minecraftforge.net).

## Setup
- ForgeGradle (`net.minecraftforge.gradle`), metadata in `META-INF/mods.toml`.
- Older Forge projects (≤1.20.1) are very common: many audits will be on 1.20.1/1.19.2/1.18.2 code.

## Entry point
```java
@Mod(MyMod.MODID)
public class MyMod {
    public MyMod(FMLJavaModLoadingContext context) {   // older: FMLJavaModLoadingContext.get()
        IEventBus modBus = context.getModEventBus();
        ModItems.ITEMS.register(modBus);
        MinecraftForge.EVENT_BUS.register(this);
    }
}
```
Same two-bus model as NeoForge: mod bus (lifecycle/registration) vs `MinecraftForge.EVENT_BUS` (gameplay). `@Mod.EventBusSubscriber(modid = MODID, bus = Bus.MOD | Bus.FORGE, value = Dist.CLIENT)`.

## Registration
`DeferredRegister.create(ForgeRegistries.ITEMS, MODID)`, values are `RegistryObject<T>` (`.get()` after registration).

## Networking
- ≤1.20.1: `NetworkRegistry.newSimpleChannel(...)`, `channel.messageBuilder(...)`, handler with `ctx.get().enqueueWork(...)` and `ctx.get().setPacketHandled(true)`.
- 1.20.2+: `ChannelBuilder.named(...).simpleChannel()`.
Same rule as everywhere: validate every client→server message on the server.

## Data
- Capabilities (`ICapabilityProvider`, `AttachCapabilitiesEvent`, `LazyOptional`) for entity/block entity/item data and inter-mod handlers (`ForgeCapabilities.ITEM_HANDLER`). Invalidate `LazyOptional`s in `invalidateCaps`.
- Item data: NBT tag (≤1.20.4), data components (1.20.5+ vanilla).

## Config
`ForgeConfigSpec`, registered with `ModLoadingContext.get().registerConfig(ModConfig.Type.X, SPEC)` (or via the context in newer versions).

## Tasks
`build`, `runClient`, `runServer`, `runData`, `runGameTestServer`.
