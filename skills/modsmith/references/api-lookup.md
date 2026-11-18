# Verifying an API against the real classes

Memory of Minecraft/loader APIs is often for the wrong version. When an audit finding or a code change depends on how an API behaves ("does this annotation default to the game bus?", "does this method exist in 1.21.1?", "is this value synced as a short?"), look at the actual classes the project compiles against.

## 1. Find the jars
The build already downloaded them. Typical locations (paths vary by plugin version):

| Setup | Where to look |
|---|---|
| NeoForge ModDevGradle | `<project>/build/moddev/artifacts/` (Minecraft + NeoForge merged jar, often with a `-sources` jar), and `~/.gradle/caches/modules-2/files-2.1/net.neoforged/` |
| NeoGradle / ForgeGradle | `~/.gradle/caches/` (search for `neoforge-*-sources.jar`, `forge-*-sources.jar`), `<project>/build/` |
| Fabric Loom | Named (Mojmap/Yarn) jars usable with `javap`: `~/.gradle/caches/fabric-loom/minecraftMaven/net/minecraft/` (`minecraft-merged`, or `minecraft-common` + `minecraft-clientonly` when the project splits client sources; pick the folder whose name contains the project's mappings). The jars directly under `fabric-loom/<mc version>/` use intermediary names. Sources exist only after `gradlew genSources`. |
| Any library | `~/.gradle/caches/modules-2/files-2.1/<group>/<artifact>/<version>/` |

**Which version is on the classpath:** ModDevGradle writes the resolved classpath to `<project>/build/moddev/*Classpath.txt`: use it to pick the exact jar versions instead of the newest one in the cache.

**FML classes** (`EventBusSubscriber`, `ConfigTracker`, `ModContainer`, `@Mod`) are not in the NeoForge jar: they live in the FancyModLoader artifacts, `~/.gradle/caches/modules-2/files-2.1/net.neoforged.fancymodloader/loader/<version>/` (often without a sources jar: use `javap`).

Search for them instead of guessing the path:
```bash
find ~/.gradle/caches <project>/build -name "*neoforge*sources*.jar" 2>/dev/null | head
```
On Windows `~` is `%USERPROFILE%` (Git Bash understands `~`).

If no jar exists yet, the project hasn't been built or synced: suggest `gradlew build` (or the IDE sync), or report the point as unconfirmed.

## 2. Read the class
- **Sources jar** (best): `unzip -p <sources.jar> net/neoforged/fml/common/EventBusSubscriber.java`
- **Binary jar only**: `unzip -l <jar> | grep EventBusSubscriber` to find it, then `javap -classpath <jar> -p net.neoforged.fml.common.EventBusSubscriber` for signatures. Use `javap -c` only if you need behaviour; bytecode is slow to read.
- Annotation defaults appear in the source, or in `javap -v` output (`default_value`).

Keep it targeted: read one class or method, not whole packages.

**Trace the call path, not just one class.** Loaders often leave a vanilla class untouched and bypass it where it is *used* (e.g. a vanilla packet still writes a 16-bit value, but the loader's patched sender uses its own payload instead). Before concluding "X is limited/broken", find who calls it (`grep` the sources jar for the class name) and read that call site too.

## 3. Other evidence
- The loader's docs for the **matching version** (docs.neoforged.net, docs.fabricmc.net, docs.minecraftforge.net) and porting primers.
- **Observed behaviour**: if the published mod visibly does the thing (a renderer appears, a config option works), the API works as used, whatever memory says.
- Running the game (`verify`) for runtime questions.

When none is available, say "unverified" in the finding or before the change, along with what would verify it.
