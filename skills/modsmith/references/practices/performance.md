# Performance

The server runs 20 ticks per second: 50 ms for *everything*, all entities, block entities, chunks, all mods. Work done "per entity per tick" is multiplied by entity count × 20.

## Hot paths (be stingy)
- Entity / block entity `tick()`, `EntityTickEvent`, `LevelTickEvent`, `ServerTickEvent`, `PlayerTickEvent`.
- Render code (every frame on the client).
- Frequently fired events (`EntityJoinLevelEvent` during chunk loads, neighbor updates).

## Patterns
- **Early return**: cheapest checks first (side, entity type, config enabled).
- **Throttle**: `if (level.getGameTime() % 20 != 0) return;`, offset by entity id to spread load (`(gameTime + entity.getId()) % 20`).
- **Countdown instead of scanning**: store "ticks until next action" per entity (attachment/field) rather than checking every tick whether time has passed by comparing global maps.
- **Avoid world scans**: no looping over large block areas or `getEntitiesOfClass` with big AABBs each tick; cache results, use events, or limit the radius and frequency.
- **Don't force chunk loads**: check `level.isLoaded(pos)` / `hasChunkAt` before reading blocks far away.
- **No allocation storms**: don't create new lists/maps/streams per tick per entity; avoid `stream()` in hot loops.
- **No logging in hot paths** (or guard it behind a debug config flag).
- **No I/O or sleeping** on the server/render thread.
- **Dirty-flag sync**: only send packets / mark changed when something actually changed.

## Measuring
Suggest the user profile with Spark (`/spark profiler`) on a test world when performance is in doubt; an audit should state performance findings as "likely impact" unless measured.
