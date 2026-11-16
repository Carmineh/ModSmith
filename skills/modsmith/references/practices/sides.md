# Sides: client vs server

## The mental model
There are two different "sides":
- **Physical side** — which program is running: the game client (`Dist.CLIENT`) or a dedicated server (`Dist.DEDICATED_SERVER`). Client-only classes (`net.minecraft.client.*`: `Minecraft`, renderers, screens, models, `KeyMapping`) **do not exist** on a dedicated server.
- **Logical side** — which half of the game a piece of code runs in. In singleplayer the client program runs *both* a logical client and an integrated logical server, on different threads. `level.isClientSide()` tells you the logical side.

Bugs come from mixing them up:
1. **Class loading leak (CRITICAL):** common code references a client class → `NoClassDefFoundError`/`ClassNotFoundException` when that code runs on a dedicated server. Java loads classes lazily, so a reference inside a method body only explodes when that method runs (or when the verifier needs it, e.g. for types in signatures, fields, lambdas, `instanceof`/casts). Don't rely on "it's never called" — isolate.
2. **Wrong logical side (HIGH):** game logic running on the logical client (changes not saved, other players don't see them, desync) or running on both sides (double effects, e.g. two items dropped, one a ghost).
3. **Static shared state (HIGH):** a `static` map written by the server and read by the client "works" in singleplayer because both are in one JVM, and breaks on a dedicated server.

## Correct patterns
- Game logic: `if (level.isClientSide()) return;` (or the opposite for visuals) at the top of handlers that fire on both sides (interaction events, `use`, `tick`).
- Client code in client-only classes: NeoForge `@Mod(dist = Dist.CLIENT)`, `@EventBusSubscriber(value = Dist.CLIENT)`; Fabric `ClientModInitializer` + `splitEnvironmentSourceSets`.
- When common code must trigger something client-side (open a screen, play a local effect), send a packet to the client, or call through a small indirection (`ClientHooks.openScreen(...)` in a client-only class, invoked only when `FMLEnvironment.dist.isClient()` / on the logical client).
- Never call `Minecraft.getInstance()` from code that may run on the server.

## How to detect
- Grep for `net.minecraft.client` imports outside client packages/source sets (`scripts/scan.mjs` does this), then check whether that class is reachable from common entry points.
- Run `runServer` — the definitive test.
