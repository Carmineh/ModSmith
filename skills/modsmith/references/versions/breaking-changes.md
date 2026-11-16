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

## 1.21.5+
Continued renames and data-driven systems. Always consult the primer for each step; port one minor version at a time when the gap is large.
