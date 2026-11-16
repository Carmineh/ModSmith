# Persistence & data

Saved data outlives code. Everything written to disk will be read back by a future version of the mod.

## Choosing where data lives
| Data belongs to... | Use (1.20.5+) |
|---|---|
| An item stack | Data component (immutable record + codec) |
| A block with logic/state beyond blockstate | Block entity (`saveAdditional`/`loadAdditional`) |
| A small finite block property (facing, powered, age) | Blockstate property |
| An entity / player (extra data on vanilla entities) | NeoForge data attachment / Fabric attachment / Forge capability |
| An entity type you own | Fields + `addAdditionalSaveData`/`readAdditionalSaveData`; `SynchedEntityData` if the client renders it |
| A chunk / the whole level | Attachment on chunk/level, or `SavedData` |
| Settings chosen by the user/server admin | Config, not saved data |

**Anti-pattern:** `static Map<UUID or Entity, X>` as storage. It isn't saved, it leaks memory, it's shared between logical sides in singleplayer, and it breaks with multiple worlds. Common audit finding.

## Rules
- **Stable keys**: NBT keys, component/attachment ids, registry names are a public contract. Renaming = data loss unless you read the old key as fallback.
- **Tolerant loading**: missing key → default, not crash. Use `contains` checks or codecs with `optionalFieldOf(..., default)`.
- **Mark dirty**: block entities `setChanged()`, `SavedData#setDirty()`; otherwise changes may not be written.
- **Sync what's rendered**: block entity data the client renders needs `getUpdateTag` + `getUpdatePacket` and `level.sendBlockUpdated(pos, state, state, Block.UPDATE_CLIENTS)` on change.
- **Version your data** when the format will evolve (`"data_version": 2`) and migrate on read.

## Resource data (datapacks in the mod jar)
- Folder names must match the version (1.21+ singular names: `recipe/`, `loot_table/`, `tags/block/`, `tags/item/`...). Wrong folder = silently ignored.
- Prefer datagen over hand-written JSON: compile-checked ids, no typos, easy to regenerate after a port. Commit `src/generated/` and regenerate it in the same commit as the code change.
- Every block needs a loot table unless it intentionally drops nothing; every translatable key needs an `en_us.json` entry.
