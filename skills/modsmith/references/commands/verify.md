# verify — build and headless checks

Goal: objective evidence that the mod builds and loads, especially on a dedicated server (the place where side bugs hide, because singleplayer runs client and server in one JVM).

Use `./gradlew` on Unix shells and `gradlew.bat` (or `./gradlew` from Git Bash) on Windows. Gradle runs can take minutes: run them in the background where possible and report progress.

## Steps

1. **Build** — `gradlew build`. Collect compile errors and warnings (deprecations are worth listing).
2. **Datagen** (if the mod has providers) — `gradlew runData` (NeoForge ≤1.21.3, Forge) / `gradlew runDatagen` (Fabric) / check the build file for the exact task name (newer NeoForge splits `runClientData`/`runServerData`). Then `git status` on `src/generated`: unexpected diffs mean the committed generated files were stale.
3. **Dedicated server smoke test** — `gradlew runServer`.
   - First run: the server stops asking to accept the EULA. Tell the user; `run/eula.txt` must contain `eula=true`, which means accepting Mojang's EULA (https://aka.ms/MinecraftEULA) — this is the user's decision, never set it yourself without their explicit OK.
   - Pass `--args="--nogui"` if needed (or rely on the run config). Wait for `Done (` in the log, then stop the server by sending `stop` on stdin, or kill the process after reading the log.
   - Look for: crashes, `NoClassDefFoundError`/`ClassNotFoundException` mentioning `client`, mixin errors/warnings, registry errors, "missing" translation or model errors, exceptions logged by the mod.
4. **Gametests** (if present) — `gradlew runGameTestServer`.
5. **Client** — can't be meaningfully automated here. Give the user a short, specific in-game checklist instead of claiming it works.

## Report

A small table: step → passed / failed / skipped (why) → key evidence (log line). Link failures to findings (`CRIT-01`) or suggest `fix`. Never report a step as passed if it didn't run.
