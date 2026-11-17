# fix — root-cause fixes

Input can be:
- an audit ID (`fix CRIT-01`, `fix CRIT-01 HIGH-02`, `fix all-critical`),
- a bug description ("cows stop producing after relog"),
- a crash report / `latest.log` excerpt / stack trace (pasted, or a path like `run/crash-reports/...`).

**No argument** (`/modsmith fix` alone): don't ask an open question. Look for something to fix, in this order, and propose it:
1. `AUDIT.md` with open findings → show the counts and the next batch from its Fix plan, and offer to start it.
2. A recent crash report (`run/crash-reports/`) or errors in `run/logs/latest.log` → offer to diagnose it.
3. Nothing found → say so in one line and offer the two ways in: run `audit` first, or describe the bug / paste the crash.

## Procedure

1. **Read the profile and git state.** If on the main branch and the fix is non-trivial or a batch, propose a branch `fix/<short-topic>`.
2. **Understand before changing.**
   - Audit ID → re-read the finding and re-check the code: it may already be fixed or the code may have moved.
   - Crash log → find the first frame in the mod's package (`at com.author.modid...`), read the "Caused by" chain bottom-up, and identify the thread (`Server thread`, `Render thread`, `Netty ...`). Typical signatures: `NoClassDefFoundError: net/minecraft/client/...` on server = side leak; `ConcurrentModificationException` / "Accessing LegacyRandomSource from multiple threads" = threading; `Registry is already frozen` / `Cannot register ... after` = registration at the wrong time; mixin `InjectionError` / "Critical injection failure" = mixin target mismatch (often wrong version or mappings); `ClassCastException` around block entities = wrong type assumption.
   - Bug description → find the code path, form a hypothesis, and explain how to reproduce it.
3. **Plan the minimal change** and state it in one or two sentences before editing. If the right fix is large (redesign), say so and propose a staged plan instead of a giant edit.
4. **Check save compatibility** (renamed keys/ids → migration). See `references/practices/persistence.md`.
5. **Edit** following the loader/version idiom (consult the loader reference — don't guess API names).
6. **Verify** with the `verify` procedure, at minimum a build; `runServer` if sides/registration/networking are involved. If the bug needs in-game testing, give the user precise steps to reproduce and confirm.
7. **Record.** If the fix closes an audit finding, update its status in `AUDIT.md` (`fixed` + short note + commit/branch if committed). Offer to commit with a message like `fix(<area>): <what> (CRIT-01)`; don't commit unless the user agrees.

## Report

What was wrong (root cause), what changed (files), how it was verified, anything left open (e.g. "needs in-game test of X"), and any side issues you noticed but didn't touch.
