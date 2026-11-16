# Networking

## Principle: the server never trusts the client
Anyone can send any payload with any values (modified clients exist). Every client→server handler must answer, before acting:
1. **Who?** The sender is a valid `ServerPlayer` (not spectator if irrelevant, alive).
2. **Allowed?** Permission level / game mode / ownership if the action needs it.
3. **Where?** Target position is loaded (`level.isLoaded(pos)`) and in reach (`distanceToSqr` ≤ ~64 for block interaction, or the menu is open: `player.containerMenu instanceof MyMenu m && m.stillValid(player)`).
4. **What?** Values bounded (enum ordinals, counts ≥ 0 and ≤ max, string length), referenced entity exists and is in the same level.
5. **State consistent?** The block at `pos` is still the expected block / block entity type.

Never accept from the client: item stacks to give, amounts of items to create, positions to teleport to, arbitrary entity ids to damage, recipe results. Send *intent* ("button 3 pressed in menu X"), compute results on the server.

## Threading
Network handlers may run on the netty thread. Any game-state access must happen on the main thread (`enqueueWork` on NeoForge/Forge; `server.execute` / `client.execute` on Fabric when needed). Touching the world from netty → random `ConcurrentModificationException`s and corruption.

## Efficiency
- Send only on change, not every tick. Batch.
- Send to whoever needs it: tracking players (`sendToPlayersTrackingEntity/Chunk`), not `sendToAllPlayers`.
- Prefer vanilla sync where it exists: block entity update packets, `SynchedEntityData` for entity fields, data components with `networkSynchronized`, menu `DataSlot`s.

## Codecs
- Read/write symmetric; use `StreamCodec.composite` for records.
- Bound collections and strings (`ByteBufCodecs.stringUtf8(max)`, list size limits).
- Version the protocol (`registrar("1")`) and bump when payloads change.
