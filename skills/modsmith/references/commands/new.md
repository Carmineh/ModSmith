# new — add a feature the idiomatic way

Syntax: `new <kind> <name> [details]`. Kinds: `block`, `item`, `blockentity`, `entity`, `menu`/`screen`, `packet`, `command`, `config`, `mixin`, `recipe`, `datagen`, `attachment`/`component`, `event`. Free-form requests ("add a cow that drops gold") map to one or more kinds.

## Procedure

0. If `DESIGN.md` exists, read it: find the milestone this request belongs to, follow its mechanics and the "design for reuse" grouping (variants = one parameterised class), and respect answered design questions. If the request needs an open question answered, ask it now (beginners: propose a default). If the request isn't in the plan, do it anyway and add it to the roadmap.
1. Read the profile and look at **how the mod already does the same kind of thing**. Consistency with the existing codebase beats your preferred style — unless the existing pattern is itself a finding (then follow the correct idiom and mention why).
2. Ask only what's needed and not obvious (e.g. for a block: does it need a block entity? a GUI? custom drops?). For beginners, propose a sensible default and go.
3. Look up the loader idiom in `references/loaders/<loader>.md`, and the relevant `practices/` file (packets → networking.md, stored data → persistence.md, mixins → mixins.md).
4. Implement the **complete** feature, not just the class. A block isn't done until it has: registration, block item, blockstate + model + item model, texture placeholder reference, loot table, translation key, creative tab entry, tags (e.g. `mineable/pickaxe`), and ideally datagen providers for them. Write a checklist per kind and tick it off in your final report.
5. Respect sides: client-only parts (renderers, screens, key mappings) go into client-only classes/registration.
5a. **Standard integrations** (only if the profile/DESIGN.md says they're wanted, see `practices/compatibility.md`): add integration code when the new content actually needs it, in the same run —
   - recipe viewer: only for **custom recipe types or processes** the viewer can't show by itself (a machine with its own recipes, in-world conversions, breeding/mutation tables). Vanilla recipe types (crafting, smelting, smithing) already appear; a block that uses them just registers itself as a "catalyst"/workstation for that category.
   - Jade: only for blocks/entities with **state worth showing** (progress, stored energy/fluid, cooldowns, owner). Plain blocks need nothing.
   If the content needs neither, say so in one line instead of adding empty plugins.
5b. Template placeholders (example mixins, example blocks/items, "Hello world" logs, `example_*` lang keys) don't belong in a mod with real content: on the first `new` run that adds real content, remove them (and their config entries) and say so. An empty example mixin still patches Minecraft for nothing.
6. Verify (`build`, plus `runData` if datagen was added, `runServer` if registration/networking changed).

## Per-kind essentials

- **block**: Block + BlockItem, blockstate/model/item model, loot table, lang, mining tags + tool requirement, creative tab, `BlockBehaviour.Properties` from an existing vanilla block where sensible.
- **item**: registration, model, lang, creative tab; data components for per-stack data (1.20.5+), never raw NBT.
- **blockentity**: type registration with valid blocks, save/load with stable keys, `getUpdateTag`/`getUpdatePacket` if the client needs the data, `setChanged()` after changes, ticker that early-returns on the wrong side, capabilities/exposed handlers if relevant.
- **entity**: type + attributes registration, renderer + model layer (client), spawn egg, loot table, spawn rules/placements if natural spawning, lang.
- **menu/screen**: menu type (server+client), screen (client), `quickMoveStack`, `stillValid`, data slots for sync.
- **packet**: payload + codec, direction, handler on the right thread, **server-side validation of everything the client sends** (see networking.md).
- **command**: Brigadier registration event, permission level, argument validation, feedback via `sendSuccess`/`sendFailure`.
- **config**: correct config type (client/common/server — server config is per-world and synced), ranges/validation, don't read values before the config is loaded, comments for every option.
- **mixin**: only when no event/API exists — say which alternatives you checked. Prefer `@Inject`/`@ModifyExpressionValue`(MixinExtras) over `@Redirect`/`@Overwrite`; `require = 1` for essential injections; client mixins in the `client` array.

Report what was created (files), what the user must still provide (textures!), and how to test in game — concrete steps ("open a creative world, search 'tier1', place it, put iron ore in the left slot…"). If the milestone is complete, tick it in `DESIGN.md` (changelog row) and propose the next milestone's command, so the user always knows the next step.
