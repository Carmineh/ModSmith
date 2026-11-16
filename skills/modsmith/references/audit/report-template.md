# AUDIT.md template

Use this structure for `.modsmith/AUDIT.md`. Omit the "Why it matters" lines when the profile says `expert`.

```markdown
# <Mod name> — Audit
_modsmith audit · <date> · <loader> <mc version> · commit <short sha> · scope: <all | path>_

## Summary
| Severity | Open | Fixed | Total |
|---|---|---|---|
| CRITICAL | | | |
| HIGH | | | |
| MEDIUM | | | |
| LOW | | | |

**Top priorities:** 2–4 sentences: the most important problems and the suggested order of work.

**Not covered:** what was not checked and why (e.g. "dedicated server not started", "worldgen out of scope").

**Done well:** 1–3 bullets.

## Fix plan
Group open findings into batches that can each become one `fix` run / one commit: same file or same mechanic together, CRITICAL/HIGH first, save-compatibility-sensitive changes flagged.

| Batch | Findings | Files | Effort | Notes |
|---|---|---|---|---|
| 1 — <theme> | <IDs> | <files> | S/M/L | <e.g. "data only, no code" or "changes saved keys → keep reading the old key"> |

Typical batches: data/resource-only fixes first (lowest risk), then one batch per mechanic or per file, then cross-cutting refactors last.

## Findings

### CRIT-01 — <short title>  `open`
- **Where:** `src/main/java/.../Foo.java:42`
- **Evidence:**
  ```java
  // minimal excerpt that shows the problem
  ```
- **Impact:** concrete scenario (who, when, what happens).
- **Why it matters:** plain-language explanation (beginners only).
- **Fix:** what to change, using the idiom for <loader> <version>.
- **Effort:** S | M | L

### HIGH-01 — ...

## Grouped minor issues (LOW)
- `LOW-01` naming: ... (files)
- `LOW-02` ...

## History
| Date | Change |
|---|---|
| <date> | Initial audit |
| <date> | CRIT-01 fixed in <commit/branch> |
```

Counting: every finding with its own ID counts once in the Summary table, including each grouped LOW (`LOW-01`, `LOW-02`… are separate findings even when listed together).

Status values: `open`, `fixed`, `wontfix` (with reason), `obsolete` (code removed/changed), `unconfirmed`.
Numbering is per severity and never reused: if CRIT-01 is fixed, the next new critical is CRIT-02.
