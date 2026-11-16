# review — check pending changes before committing

Scope: `git diff` (staged + unstaged) and untracked files, or `review <ref>` to compare against a branch/commit (e.g. `review main`).

## Procedure

1. Read the profile. Get the diff; for each changed file read enough surrounding code to judge it (a diff alone hides context like "this runs every tick").
2. Apply the audit checklist **only to what changed**, plus its direct consequences: e.g. a renamed registry id affects saves; a new packet needs server validation; a new field in a block entity needs saving and syncing; a new translatable string needs a lang entry; a new block needs loot table/tags/model.
3. Check completeness: is there a feature half-added (registered but no model, payload registered but never sent, config option never read)?
4. Same severity scale and finding format as `audit`, but IDs are local (`R1`, `R2`...) and nothing is written to `AUDIT.md` unless the user asks.

## Output (in chat)

Verdict first: **ready to commit** / **commit after fixing CRITICAL/HIGH** / **needs rework**. Then findings by severity, then a suggested commit message in Conventional Commits style (`feat(block): add milking station`) if the change is ready.
