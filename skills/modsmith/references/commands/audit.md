# audit — prioritized findings report

Goal: an honest, prioritized list of what should change in the mod, with evidence. Arguments: `--scope=<path>` to limit the files, `--min=<LEVEL>` to report only that severity and above.

## Procedure

1. **Read what modsmith already knows**: the profile, and if present `STUDY.md` (saves a lot of reading) and `DESIGN.md` (the intended design). If there's no study, do a quick architecture pass first (entry points, registries, events, networking, mixins): you can't judge code you don't understand.
2. **Run the scanner for leads**: `node <skill>/scripts/scan.mjs <mod-root> --all` (Node 18+, no install needed; `--all` prints every hit instead of the first 25 per check). Treat every hit as a hypothesis.
3. **Read the code**, spending context where bugs live:
   - Wiring: entry point, registries, event subscribers, payloads (already in STUDY if present).
   - Server-side game logic, read fully: block entities, entities, items with `use*`/`interact*`, event handlers, data loaders, codecs.
   - The mod's own data files: check **all** of them against the codecs (the scanner's `data-key-mismatch` check helps), plus README/docs claims.
   - Client, screens, renderers and compat code: skim, meaning check only (a) side safety (client classes reachable from common code), (b) obvious crashes (null/unchecked casts on data from the server), (c) hard-coded text. Don't review layout or rendering math. List skimmed areas under "Not covered".
   - For mods above ~10k lines, audit area by area (one area per pass, or one subagent per area where available) and merge the results.
4. **Go through `references/audit/checklist.md` area by area.** This is the main pass. Area **6b (game logic & data)** finds most real bugs in content mods; never skip it. Load the matching `references/practices/*.md` and the loader reference when you need the correct idiom for this loader/version.
5. **Compare with the plan and the docs.** If `DESIGN.md` exists: content in the code but not in the plan (undocumented features), planned content missing or different, numbers that disagree (design vs code vs tooltip). Undocumented features are usually a question for the author, not a finding. Don't repeat design questions that DESIGN.md already tracks as open; reference them.
6. **Confirm each problem by reading the code** and, where cheap, by reasoning through a concrete scenario (dedicated server, two players, chunk unload, world reload, another mod present). Drop scanner hits that turn out fine.
7. **Assign severity** with `references/audit/severity.md`. Severity is about real impact in this mod, not about the category: a client import in common code is CRITICAL only if that class actually loads on a dedicated server.
8. **Keep IDs stable.** If a previous `AUDIT.md` exists, existing findings keep their ID and get their status updated (open / fixed / wontfix / obsolete); new findings get new IDs. This makes the file a maintenance log.
9. Optionally run `verify` (build + `runServer`): a crash on dedicated server start is the strongest possible evidence. Ask first if it would take long.

### Stale modsmith documents
If the profile, STUDY or DESIGN disagree with the code (e.g. profile says "no mixins" and the mod has two):
- normal run: update the profile, tell the user, and note stale STUDY/DESIGN sections in the summary (suggest `study` or `plan` to refresh them);
- read-only run (`--out`, or someone else's mod): don't touch them; list what is stale under "Not covered / notes" in the report. This is not a finding against the mod.

### Run settings vs profile
Values given for this run (by the user or the caller) win over the profile for this run only, e.g. a different experience level. Don't rewrite the profile because of them unless the user says the change is permanent.

## Writing findings

Use `references/audit/report-template.md`. Each finding has: ID (`CRIT-01`, `HIGH-02`, `MED-03`, `LOW-04`), title, location (file:line), evidence (short code excerpt or exact behaviour), impact (concrete scenario), fix (what to do, and for which loader/version idiom), effort (S/M/L). Add a plain-language "why it matters" line **only for beginners**.

**One finding per distinct problem**, meaning a distinct impact and a distinct fix. Several missing checks in the same handler are one finding if one fix covers them and they have the same severity; split them when severities differ (e.g. an unbounded value that can freeze the server vs a missing reach check).

Be calibrated:
- Separate bugs from design questions: if the author could have meant it, it goes under "Questions for the author", not in the findings (see `severity.md`).
- Don't inflate. Ten honest MEDIUMs are more useful than ten fake CRITICALs; inflation makes the user stop trusting the report.
- Don't pad with LOW style nits to look thorough; group them.
- Say what you did *not* check (e.g. "worldgen not reviewed", "couldn't run the server").
- Note good things too, briefly: it tells the user what to keep doing.

## Output

Write `AUDIT.md` in the modsmith directory (see "Where outputs go" in SKILL.md), including the **Fix plan** section, then summarize in chat: counts per severity, the top 3–5 findings, and a suggested order of work (usually CRITICAL → HIGH, grouping findings that touch the same files). Suggest `/modsmith fix <ID>` as the next step.
