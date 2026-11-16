# audit — prioritized findings report

Goal: an honest, prioritized list of what should change in the mod, with evidence. Arguments: `--scope=<path>` to limit the files, `--min=<LEVEL>` to report only that severity and above.

## Procedure

1. Read the profile and, if present, `.modsmith/STUDY.md` (it saves a lot of reading). If there's no study, do a quick architecture pass first (entry points, registries, events, networking, mixins) — you can't judge code you don't understand.
2. Run the scanner for leads: `node <skill>/scripts/scan.mjs <mod-root> --all` (Node 18+, no install needed; `--all` prints every hit instead of the first 25 per check). Treat every hit as a hypothesis.
3. **Reading strategy** (context is limited — spend it where bugs live):
   1. Wiring: entry point, registries, event subscribers, payloads (already in STUDY if present).
   2. Server-side game logic, read fully: block entities, entities, items with `use*`/`interact*`, event handlers, data loaders, codecs.
   3. The mod's own data files: check **all** of them against the codecs (the scanner's `data-key-mismatch` check helps), plus README/docs claims.
   4. Client, screens, renderers and compat code: skim — meaning check only (a) side safety (client classes reachable from common code), (b) obvious crashes (null/unchecked casts on data from the server), (c) hard-coded text. Don't review layout or rendering math. List skimmed areas under "Not covered".
   For mods above ~10k lines, audit area by area (one area per pass, or one subagent per area where available) and merge the results.
3b. Go through `references/audit/checklist.md` area by area — area **6b (game logic & data)** finds most real bugs in content mods; never skip it. For each area, read the relevant code; load the matching `references/practices/*.md` and the loader reference when you need the correct idiom for this loader/version.
4. For each problem, **confirm it by reading the code** and, where cheap, by reasoning through a concrete scenario (dedicated server, two players, chunk unload, world reload, another mod present). Drop scanner hits that turn out fine.
5. Assign severity with `references/audit/severity.md`. Severity is about real impact in this mod, not about the category: a client import in common code is CRITICAL only if that class actually loads on a dedicated server.
6. If a previous `AUDIT.md` exists, keep IDs stable: existing findings keep their ID and get their status updated (open / fixed / wontfix / obsolete); new findings get new IDs. This makes the file a maintenance log.
7. Optionally run `verify` (build + `runServer`) — a crash on dedicated server start is the strongest possible evidence. Ask first if it would take long.

## Writing findings

Use `references/audit/report-template.md`. Each finding has: ID (`CRIT-01`, `HIGH-02`, `MED-03`, `LOW-04`), title, location (file:line), evidence (short code excerpt or exact behaviour), impact (concrete scenario), fix (what to do, and for which loader/version idiom), effort (S/M/L), and for beginners a "why it matters" line in plain language.

Be calibrated:
- Don't inflate. Ten honest MEDIUMs are more useful than ten fake CRITICALs; inflation makes the user stop trusting the report.
- Don't pad with LOW style nits to look thorough; group them.
- Say what you did *not* check (e.g. "worldgen not reviewed", "couldn't run the server").
- Note good things too, briefly — it tells the user what to keep doing.

## Output

Write `AUDIT.md` in the modsmith directory (see "Where outputs go" in SKILL.md), including the **Fix plan** section, then summarize in chat: counts per severity, the top 3–5 findings, and a suggested order of work (usually CRITICAL → HIGH, grouping findings that touch the same files). Suggest `/modsmith fix <ID>` as the next step.
