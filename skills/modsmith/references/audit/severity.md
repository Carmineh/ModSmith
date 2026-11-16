# Severity scale

Severity measures **realistic impact on players, servers and worlds**, weighted by likelihood. Ask: "What is the worst thing that plausibly happens, to whom, and how often?"

## CRITICAL — must fix before the next release

Something breaks badly or can be abused, in normal use.

- Crash (client or server) on a reachable path: startup, joining, normal interaction.
- Dedicated server fails to start or crashes: client-only classes (`net.minecraft.client.*`, renderers, screens) loaded from common code paths.
- World/save corruption or data loss: unstable save keys, writing wrong data types, losing inventory contents, breaking existing worlds after an update without migration.
- Server trusts the client: packet handlers that accept positions, item stacks, amounts, entity ids, or "do X" commands without validation → duplication, arbitrary item creation, griefing at distance, OP-only actions without permission checks.
- Infinite loops / unbounded recursion / unbounded memory growth reachable in normal play.

## HIGH — fix soon; will hurt real users

- Client/server desync: state changed on one side only, missing sync of block entity data, logic gated on the wrong side (`isClientSide` inverted or missing).
- Works in singleplayer but not on dedicated servers (and doesn't crash): e.g. static state shared between integrated client and server.
- Memory leaks: static collections holding `Level`, `Entity`, `Player`, `BlockEntity`, `ItemStack`; listeners never removed; caches without bounds or cleanup on world unload. HIGH when it grows with play time or keeps whole worlds/players alive; MEDIUM for a small bounded map whose only cost is stale entries.
- Performance: heavy work every tick for every entity/block entity (world scans, `getEntitiesOfClass` with big boxes, allocation-heavy loops, logging every tick), synchronous chunk loads, I/O on the main thread.
- Threading: game state mutated from network/netty threads or custom threads without `enqueueWork`/`execute`.
- Mixins that break compatibility: `@Overwrite`, broad `@Redirect`s on hot vanilla methods, injections without `require`, targeting fragile ordinals.
- Wrong registration timing (works by luck of load order).
- A feature that silently doesn't work (config never read, event never registered, recipe never loaded due to wrong folder name, documented JSON field never used).
- Gameplay-breaking logic or balance bugs: wrong results from machines, cooldowns that never expire, mutation/drop chances silently at 100%, state lost on capture/release that players can exploit. (Purely cosmetic logic bugs are MEDIUM or LOW.)
- Network traffic proportional to entities/block entities × ticks (syncing values that change every tick).

## MEDIUM — maintainability and correctness debt

- Deprecated or legacy API for this version (e.g. raw NBT on ItemStacks in 1.20.5+, `new ResourceLocation(...)` in 1.21+).
- Hardcoded tunables that should be config; magic numbers spread across classes.
- Hand-written JSON that should come from datagen (risk of drift, typos), or committed generated files that are stale.
- Missing translation keys, missing loot tables (block drops nothing), missing mining tags. A missing or broken loot table is HIGH when the block is valuable or part of progression (the player loses it by breaking it), and when it holds an inventory.
- God classes, duplicated logic, unclear responsibilities that make changes risky.
- Missing null/empty checks that don't crash today but will with likely changes or other mods.
- Swallowed exceptions (`catch (Exception e) {}`) or `printStackTrace()` **on a path where a failure would hide a real problem** (loading data, saving, network handling). An empty catch around a harmless fallback (e.g. choosing a display name) is LOW.

## LOW — polish

- Naming, package structure, formatting, comments, README/docs.
- Compiler warnings, unused code, minor inefficiencies off the hot path.
- `System.out.println` used for logging (MEDIUM if in a tick path).

## Tie-break rules

- **Reachability lowers or raises severity.** Client import in a class that only loads on the client → not a finding (or LOW to suggest isolating it). The same import in a class loaded by the common mod constructor → CRITICAL.
- **Exploitability on multiplayer raises it.** A missing check that lets any player dupe items is CRITICAL even if "nobody would do that".
- **Frequency matters.** Something inefficient in a once-per-load path is LOW; the same thing in `tick()` is HIGH.
- **When in doubt between two levels, pick the lower one and explain the condition** under which it would be higher ("HIGH if the server has many cows loaded").
- Uncertain findings are allowed but must be labelled **(unconfirmed)** with what would confirm them.
- **Bug or design choice?** If the behaviour could plausibly be intended by the author (balance values, overlapping recipes or definitions, content that only exists with optional mods, unusual but consistent mechanics), it is **not a finding**. Put it under "Questions for the author" with what happens in practice and what to change *if* it isn't intended. Only the parts that are wrong either way (e.g. non-deterministic resolution of the overlap, a crash) stay findings.
- **Observed behaviour is evidence.** If a pattern looks wrong by the docs but the feature visibly works (the mod is published, the renderer shows up in game), don't report it as broken: note it under "Not covered / needs verification", or as LOW for clarity.
- **Loader patches matter.** Loaders patch some vanilla limitations (example to verify, not assume: whether menu `ContainerData` values above 32767 survive sync on this loader/version). Before reporting a "vanilla limitation" bug, check whether the loader patches it; if you can't check, mark it unconfirmed.
