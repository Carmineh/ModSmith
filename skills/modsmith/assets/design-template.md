# <Mod name>: Design
_Created by `/modsmith plan` on <date>. This is the mod's plan: edit it freely. `new` reads it, `audit` compares it with the code._

## Idea
<The user's description, in their words, cleaned up into 2–4 sentences: what the mod adds and why it's fun or useful.>

## Core mechanics
<One bullet per mechanic: what the player does → what happens. Concrete numbers only if the user gave them; otherwise mark as open.>
- <e.g. Furnaces come in 3 tiers; each tier smelts faster and has more input slots.>

## Content
| Kind | Id | Purpose | Notes |
|---|---|---|---|
| block + block entity | `<id>` | <what it does> | <shares class with …> |
| item | `<id>` | | |

Design for reuse: variants of the same thing (tiers, colours, materials) are **one class with parameters**, not copies.

## Dependencies & integrations
| Mod | Required? | Why | Available for <loader> <version>? |
|---|---|---|---|
| <e.g. Create> | yes | rotational power (RPM/stress) | ✔ checked <source, date> / ✘ blocker |

## Open design questions
Decisions that change the code structure. Answer them before the milestone that needs them.
- [ ] Q1 <e.g. Do higher tiers need fuel, or Create rotation only?>: needed by M2

## Roadmap
Each milestone is small, playable and testable in game. Tick it when it's done (`new` and `fix` update this list).

| # | Milestone | Commands | Status |
|---|---|---|---|
| M1 | <first playable thing, e.g. tier-1 furnace that smelts> | `/modsmith new block tier1_furnace` | ☐ |
| M2 | <…> | `/modsmith new …` | ☐ |
| M3 | Polish: final textures, balance, extra languages, config options | `/modsmith new config …` | ☐ |
| final | Check: build + dedicated server | `/modsmith verify` | ☐ |

## Out of scope (for now)
<Ideas mentioned but deliberately postponed, so they don't creep into early milestones.>

## Changelog of this plan
| Date | Change |
|---|---|
| <date> | Initial plan |
