# plan — turn an idea into a design and a guided roadmap

Goal: give the user a **guided path**. From a free-form description ("a Create addon with a block that does X with RPM", "tiered furnaces") produce `DESIGN.md` in the modsmith directory: the idea, mechanics, content list, dependencies, open design questions and a roadmap of small milestones, each mapped to concrete `/modsmith` commands.

Used by:
- `init` on a new mod (runs this procedure after the description question);
- `/modsmith plan` on an existing mod, to plan a new feature set ("add a tier system") or to rebuild the plan from the code;
- `/modsmith plan` with no argument when `DESIGN.md` exists: show progress and the next milestone.

## Procedure

1. **Get the idea.** If the user hasn't described it yet, ask for 1–3 sentences. Offer examples so beginners know what's expected. Accept "skip" — then write only the Idea section as "not defined yet" and stop.
2. **Understand before designing.** Restate the idea in one or two sentences and list the mechanics you inferred. Ask **at most 3–4 questions**, only the ones that change the code structure (e.g. "do tiers share one GUI?", "is power from Create rotation, FE, or fuel?"). Everything else goes to "Open design questions" with a sensible default noted. Beginners: propose the default yourself ("I'd start with X because…") instead of asking.
3. **Check dependencies for real.** For each mod the idea depends on (Create, JEI, a library…), check it exists for the target loader **and** Minecraft version — on Modrinth (`https://api.modrinth.com/v2/project/<slug>/version?loaders=["<loader>"]&game_versions=["<mc>"]`) or CurseForge/official pages. Record source and date. A required dependency that doesn't exist for the chosen loader/version is a **blocker**: say so immediately and propose the alternative (other loader or version). During `init` this happens **before** the project is created, so the choice of loader/version follows the idea, not the other way round.
4. **Design for reuse.** Group variants (tiers, materials, colours) into one parameterised class or data-driven definitions; prefer data (JSON, tags, config) for balance numbers so they can be tuned without code.
5. **Cut it into milestones.** Each milestone: small (one `new` run or two), **playable in game** at the end, ordered so the first one gives a visible result quickly (motivation matters, especially for beginners). Map each to the exact commands. Add a final `verify` milestone. Put extras the user mentioned but that aren't needed for a first version in "Out of scope (for now)".
6. **Write `DESIGN.md`** from `assets/design-template.md` in `docs_language`. Don't write game code in `plan`.
7. **Hand over the first step.** End with the next command to run (M1) and one sentence on what the user will see in game when it's done.

## Updating the plan
- `new` and `fix` tick the milestone they complete and add a changelog row.
- When the user changes their mind ("actually tiers should need Create power"), update mechanics, questions and roadmap; never silently drop a milestone — move it to "Out of scope" with the reason.
- On an existing mod without `DESIGN.md`, `plan` can reconstruct the Idea/Content sections from STUDY.md and the code, marking them "reconstructed".
