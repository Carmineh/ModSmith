# Breaking changes by Minecraft version (modding-relevant)

High-level map of what moved. It is **not exhaustive** — for each version step, also read the official primers: NeoForge porting primers (linked from the neoforged.net blog / the neoforged GitHub organisation) and the Fabric blog post for that version (fabricmc.net/blog). When this file and the actual sources disagree, the sources win.

## 1.18 – 1.20.1 (still common in the wild)
- Java 17. World height −64..320 (1.18).
- 1.19.3: registry overhaul — `Registries` (keys) vs `BuiltInRegistries` (Mojmap); creative tabs filled via event (Forge `CreativeModeTabEvent` → later `BuildCreativeModeTabContentsEvent`).
- 1.19.4: damage sources data-driven (`DamageTypes`); `Level#damageSources()`.
- 1.20: `CreativeModeTab` is a registry; sign/smithing changes; `Level#getRandom` usage on server.
- 1.20.1 is the last version where Forge and NeoForge are near-identical.

## 1.20.2 – 1.20.4
- NeoForge diverges from Forge: own networking (later rewritten again in 1.20.5), capability rework (NeoForge 20.3: `BlockCapability`, `RegisterCapabilitiesEvent`), data attachments introduced, event renames.
- Vanilla: configuration phase in networking (1.20.2).

## 1.20.5 / 1.20.6 — big one
- **Java 21.**
- **Item NBT → data components.** `ItemStack#getTag/setTag` gone; use `DataComponents.*` / custom `DataComponentType`s. Old items in worlds are converted by vanilla's data fixers only for vanilla data — the mod's custom item NBT needs a migration plan (`DataComponents.CUSTOM_DATA` holds leftover tags).
- `StreamCodec` / `RegistryFriendlyByteBuf`; vanilla `CustomPacketPayload` networking adopted by NeoForge (`RegisterPayloadHandlersEvent`) and Fabric (`PayloadTypeRegistry`).
- Block entity `load/saveAdditional` take a `HolderLookup.Provider`.
- NeoForge: `mods.toml` → `neoforge.mods.toml`; `TickEvent` split into `ServerTickEvent.Pre/Post`, `LevelTickEvent`, `EntityTickEvent`, `PlayerTickEvent`.
- Armor materials became a registry; food properties became a component.

## 1.21 / 1.21.1
- `new ResourceLocation(...)` no longer accessible → `ResourceLocation.fromNamespaceAndPath`, `ResourceLocation.parse`, `withDefaultNamespace`.
- **Data folders singular**: `recipes→recipe`, `loot_tables→loot_table`, `advancements→advancement`, `tags/blocks→tags/block`, `tags/items→tags/item`, `tags/entity_types→tags/entity_type`, `tags/fluids→tags/fluid`, `structures→structure`, etc. Old folders are silently ignored → features "disappear" with no error.
- Enchantments are data-driven (registry + JSON); hardcoded enchantment checks need `Holder<Enchantment>` lookups.
- Recipes: `RecipeInput` replaces `Container` for matching.
- NeoForge: common tags moved to the `c:` namespace (`Tags.Items...`), many renamed.
- 1.21.1 is a long-lived "stable" target for many mods.

## 1.21.2 – 1.21.4 (if porting beyond 1.21.1)
- `Item.Properties` / `BlockBehaviour.Properties` need the registry id set (`setId(ResourceKey)`) before construction — registration helpers changed accordingly.
- Recipe system reworked (recipe display, `RecipeBookCategory` registry), `Entity#hurt` split (`hurtServer`), equipment/armor model changes, many renames.
- 1.21.4: client item model definitions (`assets/<ns>/items/*.json`); NeoForge `GatherDataEvent.Client` / `.Server` and `runClientData` / `runServerData`.

- 1.21.2 also: interaction results unified (`ItemInteractionResult` → `InteractionResult`, `sidedSuccess` gone), `MobSpawnType` → `EntitySpawnReason`, entity/BE renderers use render states, `SimpleJsonResourceReloadListener` is codec-based.
- 1.21.4: item renderers (BEWLR) replaced by special model renderers; item colours by `ItemTintSource` referenced from the item definition JSON.

## 1.21.5 – 1.21.11
Orientation only, gathered from the NeoForge primers during a real port plan (2026-11); confirm each point in the primer for that version.
- 1.21.5: `CompoundTag` getters return `Optional` / `getXOr(key, default)`; spawn eggs use textures (no programmatic colours); `Cow` gained variants (`AbstractCow` base); `moveTo` → `snapTo`; block removal side effects moved from `onRemove` to `BlockEntity#preRemoveSideEffects` + `affectNeighborsAfterRemoval`; tooltips take `TooltipDisplay` + `Consumer<Component>`.
- 1.21.6: saving/loading through `ValueOutput` / `ValueInput` (block entities, entities); GUI rendering reworked.
- 1.21.9: entity data on item stacks is `TypedEntityData` (type no longer in the `id` key of the tag); rendering via feature submission (`SubmitNodeCollector`); `level.isClientSide` field → `isClientSide()`. **NeoForge 21.9 transfer rework:** `IItemHandler`/`IFluidHandler`/`IEnergyStorage` and their templates → `ResourceHandler<ItemResource|FluidResource>` and `EnergyHandler` (old classes deprecated for removal). Inventory save formats can change: write a legacy reader.
- 1.21.11: `ResourceLocation` → `Identifier`, several package moves.

## 26.1+ (new version numbering)
From 2026 Minecraft versions are year-based (`26.1`, `26.1.2`…). Orientation only, confirm in the 26.1 primer:
- Java 25, Gradle 9.1+; NeoForge versions have four components (`26.1.2.x`); new MDK metadata template.
- The game is **no longer obfuscated**: official names include parameter names, so **Parchment is not needed** from 26.1 on.
- Further GUI/render renames (e.g. `GuiGraphics` → render-state extraction), immutable stack templates.

Big jumps: port through a **stepping-stone version** (e.g. 1.21.1 → 1.21.11 → 26.1.x) where each stage compiles, choosing stones where your dependencies exist. Always read every primer on the way; this file only tells you where to look.
