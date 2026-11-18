# GitHub: automatic build and publish

Used by `init` (optional GitHub phase) and `new ci` on existing mods. Two workflows:

- **Build** on every push and pull request: proves the mod compiles on a clean machine and keeps the jar as a downloadable artifact.
- **Publish** when the author decides: builds and uploads the release to Modrinth and/or CurseForge (and optionally GitHub Releases), using tokens stored as repository secrets.

The pattern below comes from a real, working mod (a NeoForge Create addon); adapt it to the profile.

## Before writing anything

Read the profile and the build: default branch, Java version, loader(s), modules (multiloader projects have one `build/libs` per loader module), existing `.github/workflows/` (extend, don't duplicate). Take every action and plugin version from its official README or release page at the time of writing, never from memory: `actions/checkout`, `actions/setup-java`, `gradle/actions/wrapper-validation`, `actions/upload-artifact`, and the Gradle publishing plugin.

## 1. Build workflow: `.github/workflows/build.yml`

```yaml
name: Build

on:
  push:
    branches: [ "<default branch>" ]
    paths-ignore: [ '**.md', 'LICENSE', '.gitignore' ]
  pull_request:
    branches: [ "<default branch>" ]
    paths-ignore: [ '**.md', 'LICENSE', '.gitignore' ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<current>
        with:
          fetch-depth: 0          # versions computed from tags need the history
      - uses: actions/setup-java@<current>
        with:
          java-version: '<java from the profile>'
          distribution: 'temurin'
      - uses: gradle/actions/wrapper-validation@<current>   # rejects a tampered gradle-wrapper.jar
      - run: chmod +x ./gradlew
      - run: ./gradlew build
      - uses: actions/upload-artifact@<current>
        with:
          name: <mod-name>-artifacts
          path: build/libs/          # multiloader: one path per loader module, e.g. neoforge/build/libs/
```

If the project has gametests, add `./gradlew runGameTestServer` after the build (it exits non-zero when a test fails).

## 2. Publish workflow: `.github/workflows/publish.yml`

Manual trigger (`workflow_dispatch`) is the safe default: the author presses "Run workflow" when a version is ready. Alternative: on a published GitHub release. Restrict it to the release branch.

```yaml
name: Publish to Modrinth/CurseForge
on: [workflow_dispatch]

permissions:
  contents: write              # only needed if it also creates GitHub Releases

jobs:
  release:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/<release branch>'
    steps:
      - uses: actions/checkout@<current>
      - uses: actions/setup-java@<current>
        with:
          java-version: '<java>'
          distribution: 'temurin'
      - uses: gradle/actions/wrapper-validation@<current>
      - run: chmod +x ./gradlew
      - name: Publish
        env:
          MODRINTH_TOKEN: ${{ secrets.MODRINTH_TOKEN }}
          CURSEFORGE_TOKEN: ${{ secrets.CURSEFORGE_TOKEN }}
        run: ./gradlew build publishMods
```

## 3. Gradle side: `me.modmuss50.mod-publish-plugin`

Add the plugin to `plugins { }` (version from its documentation), then:

```groovy
publishMods {
    file = jar.archiveFile                    // NeoForge MDK; Fabric Loom: remapJar.archiveFile
    changelog = "Release $mod_version"        // or read the matching section of CHANGELOG.md
    type = STABLE                             // BETA / ALPHA for pre-releases
    modLoaders.add("neoforge")                // or "fabric"; multiloader: one publishMods per loader module

    curseforge {
        accessToken = providers.environmentVariable("CURSEFORGE_TOKEN")
        projectId = "<CurseForge project id>"
        minecraftVersions.add(minecraft_version)
        clientRequired = true
        serverRequired = true
        // requires("jei") / optional("jade") for declared dependencies
    }

    modrinth {
        accessToken = providers.environmentVariable("MODRINTH_TOKEN")
        projectId = "<Modrinth project id>"
        minecraftVersions.add(minecraft_version)
    }
}
```

Keep the published dependencies in sync with the mod metadata (required vs optional). Bump `mod_version` before each publish: both sites reject a version that already exists.

## 4. What the user does (Modsmith never handles tokens)

Explain these steps; don't do them for the user, and never write a token in a file, a commit or a chat message:
1. Create the project pages on Modrinth and/or CurseForge (first version can be uploaded by hand) and copy the **project ids** into `publishMods`.
2. Create the tokens: Modrinth personal access token with permission to create versions; CurseForge API token from the account settings.
3. Add them on GitHub: repository **Settings → Secrets and variables → Actions → New repository secret**, named exactly `MODRINTH_TOKEN` and `CURSEFORGE_TOKEN`.
4. Push, check that **Build** passes, then run **Publish** from the Actions tab when a version is ready.

Modsmith writes the workflow files and the Gradle block, verifies `./gradlew build` locally still passes, and follows the profile's commit policy. It never creates the remote repository, never pushes and never triggers the publish.
