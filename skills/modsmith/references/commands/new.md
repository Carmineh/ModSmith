# new: add a feature the idiomatic way

Syntax: `new <kind> <name> [details]`. Kinds: `ci` (GitHub build/publish workflows, see `references/github-ci.md`), `block`, `item`, `blockentity`, `entity`, `menu`/`screen`, `packet`, `command`, `config`, `mixin`, `recipe`, `datagen`, `attachment`/`component`, `event`. Free-form requests ("add a cow that drops gold") map to one or more kinds.

## Procedure

0. If `DESIGN.md` exists, read it: find the milestone this request belongs to, follow its mechanics and the "design for reuse" grouping (variants = one parameterised class), and respect answered design questions. If the request needs an open question answered, ask it now (beginners: propose a default). If the request isn't in the plan, do it anyway and add it to the roadmap.
0b. **Baseline check: on every `new` run, even when the request turns out to need no change** (already done, duplicate, small tweak). The rules below apply to the mod as a whole, not only to content added in this run, and the skill's rules may be newer than the mod. Check quickly and fix what's missing, telling the user what you added and why:
   - the mod has blocks/items but **no creative tab of its own**, or existing content is missing from it or from the fitting vanilla tab (step 4b);
   - **template placeholders** are still present (step 5b);
   - existing content lacks something from the per-kind essentials (loot table, lang key in one of the mod's languages, mining tag);
   - stray files in the project root that aren't part of the mod (tool crash dumps like `*.stackdump`, leftover temp folders).
   Keep it proportionate: fix small gaps in the same run; for larger ones (e.g. a wanted integration never set up) propose them as the next step instead.
1. Read the profile and look at **how the mod already does the same kind of thing**. Consistency with the existing codebase beats your preferred style: unless the existing pattern is itself a finding (then follow the correct idiom and mention why).
2. Ask only what's needed and not obvious (e.g. for a block: does it need a block entity? a GUI? custom drops?). For beginners, propose a sensible default and go.
3. Look up the loader idiom in `references/loaders/<loader>.md`, and the relevant `practices/` file (packets → networking.md, stored data → persistence.md, mixins → mixins.md).
4. Implement the **complete** feature, not just the class. A block isn't done until it has: registration, block item, blockstate + model + item model, texture placeholder reference, loot table, translation key, creative tab entry, tags (e.g. `mineable/pickaxe`), and ideally datagen providers for them. Write a checklist per kind and tick it off in your final report.
5. Respect sides: client-only parts (renderers, screens, key mappings) go into client-only classes/registration.
4b. **Creative tabs: both, always.** Every obtainable block/item the mod adds goes in:
   - the **mod's own creative tab**: create it the first time the mod gets a block or item (registered tab with a translated title `itemGroup.<modid>.<name>` in every lang file, and one of the mod's items as icon), then append new content to it in a sensible order (progression/tier order, not registration accident). One tab is the default; split into several only when the mod has many dozens of entries;
   - the fitting **vanilla tab(s)** (functional blocks, building blocks, tools, ingredients, spawn eggs…), placed next to the related vanilla item where the loader allows (e.g. after the vanilla furnace).
   Keep the tab's content list in one place (e.g. iterate the registry holder/enum) so new entries can't be forgotten. Technical/unobtainable items stay out of both.
5a. **Standard integrations** (only if the profile/DESIGN.md says they're wanted, see `practices/compatibility.md`): add integration code when the new content actually needs it, in the same run: 
   - recipe viewer: only for **custom recipe types or processes** the viewer can't show by itself (a machine with its own recipes, in-world conversions, breeding/mutation tables). Vanilla recipe types (crafting, smelting, smithing) already appear; a block that uses them just registers itself as a "catalyst"/workstation for that category.
   - Jade: only for blocks/entities with **state worth showing** (progress, stored energy/fluid, cooldowns, owner). Plain blocks need nothing.
   If the content needs neither, say so in one line instead of adding empty plugins.
5b. Template placeholders (example mixins, example blocks/items, "Hello world" logs, `example_*` lang keys) don't belong in a mod with real content: on the first `new` run that adds real content, remove them (and their config entries) and say so. An empty example mixin still patches Minecraft for nothing.
6. Verify (`build`, plus `runData` if datagen was added, `runServer` if registration/networking changed).

## Per-kind essentials

- **block**: Block + BlockItem, blockstate/model/item model, loot table, lang, mining tags + tool requirement, creative tabs (mod tab + vanilla tab, step 4b), `BlockBehaviour.Properties` from an existing vanilla block where sensible.
- **item**: registration, model, lang, creative tabs (mod tab + vanilla tab); data components for per-stack data (1.20.5+), never raw NBT.
- **blockentity**: type registration with valid blocks, save/load with stable keys, `getUpdateTag`/`getUpdatePacket` if the client needs the data, `setChanged()` after changes, ticker that early-returns on the wrong side, capabilities/exposed handlers if relevant.
- **entity**: type + attributes registration, renderer + model layer (client), spawn egg, loot table, spawn rules/placements if natural spawning, lang.
- **menu/screen**: menu type (server+client), screen (client), `quickMoveStack`, `stillValid`, data slots for sync. **Ghost/filter slots** store a normalised copy (the item only, count 1, no components unless the filter really matches on them): copying the carried stack as-is clones shulker contents, written books etc. into the block and the item that drops from it (free duplication of data, oversized packets).
- **inventory size**: the slot count comes from code (tier, constant), not from saved data. When loading, copy saved stacks into a handler of the right size instead of letting the saved `Size` resize it, so changing the slot count later can't break existing worlds.
- **anything that collects item entities** (vacuums, magnets, collectors): respect what vanilla respects, skip items with a pickup delay (`hasPickUpDelay()`) and items other mods mark as not to be moved (e.g. the `PreventRemoteMovement` tag convention); limit the area and the scan frequency (config).
- **packet**: payload + codec, direction, handler on the right thread, **server-side validation of everything the client sends** (see networking.md).
- **command**: Brigadier registration event, permission level, argument validation, feedback via `sendSuccess`/`sendFailure`.
- **config**: correct config type (client/common/server, server config is per-world and synced), ranges/validation, don't read values before the config is loaded, comments for every option.
- **mixin**: only when no event/API exists, say which alternatives you checked. Prefer `@Inject`/`@ModifyExpressionValue`(MixinExtras) over `@Redirect`/`@Overwrite`; `require = 1` for essential injections; client mixins in the `client` array.

Report what was created (files), what the user must still provide (textures!), and how to test in game: concrete steps ("open a creative world, search 'tier1', place it, put iron ore in the left slot…"). Apply the profile's commit policy (`auto`: commit the milestone once the build passes; `propose`: give the commit message; `ask`: ask). If the milestone is complete, tick it in `DESIGN.md` (changelog row) and propose the next milestone's command, so the user always knows the next step.
