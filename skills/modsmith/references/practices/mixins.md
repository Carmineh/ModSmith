# Mixins

Mixins patch Minecraft's (or other mods') bytecode. They're powerful and the #1 source of mod incompatibilities and crashes after updates.

## Before writing one
Check, in order: is there a loader event/API? a vanilla extension point (tags, data-driven registries, loot modifiers, block/item subclass override)? an existing library? Use a mixin only if all are "no" — and write down why (comment above the mixin).

## Choosing the injection (least invasive first)
1. `@Inject` at HEAD/RETURN/specific `@At` — adds code, others can still inject.
2. MixinExtras (bundled with NeoForge and Fabric): `@ModifyExpressionValue`, `@ModifyReturnValue`, `@WrapOperation`, `@WrapWithCondition` — compose with other mods' changes. Prefer these over `@Redirect`.
3. `@ModifyVariable`, `@ModifyArg(s)` — targeted value changes.
4. `@Redirect` — only one mod can redirect a call site; conflicts crash. Avoid.
5. `@Overwrite` — replaces the whole method; breaks every other mod touching it. Treat as HIGH in audits.

## Hygiene
- Mixin classes are `abstract`, live in a `mixin` package listed in the config, and contain no logic beyond delegating to a normal class (easier to test, read and port).
- Client-only targets go in the config's `client` array (otherwise dedicated server crash).
- `require = 1` (or config `"injectors": {"defaultRequire": 1}`) for injections the mod can't work without — a silent miss is worse than a clear error.
- Avoid `ordinal`/`shift` that depends on exact bytecode layout when a more stable `@At` exists.
- `@Unique` for added fields/methods; prefix them with the mod id to avoid name clashes.
- `@Shadow` only what you need; accessors/invokers (`@Accessor`, `@Invoker`) or access transformers/wideners for simple private access instead of reflection.
- After a version port, mixins are the last thing to fix and the first thing to test at runtime (they compile fine and fail at load).
