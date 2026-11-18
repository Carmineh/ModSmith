/**
 * Scanner tests. Each test builds a tiny fake mod with exactly one pattern and checks that the right
 * lead appears (or, for the safe variant, that nothing appears). Run with: node --test tests/
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findingIds, java, neoforgeMod, scanFiles } from "./helpers.mjs";

const SRC = "src/main/java/com/example/testmod";

test("a clean mod produces no leads", () => {
  assert.deepEqual(findingIds(scanFiles(neoforgeMod())), []);
});

test("inventory reads loader, version and mod id", () => {
  const inv = scanFiles(neoforgeMod()).inventory;
  assert.deepEqual(inv.loader, ["neoforge"]);
  assert.equal(inv.minecraft_version, "1.21.1");
  assert.equal(inv.mod_id, "testmod");
});

// ---------------------------------------------------------------- sides

test("client import used in common code is reported", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/Helper.java`]: java(
      "package com.example.testmod;",
      "import net.minecraft.client.Minecraft;",
      "public class Helper {",
      "    public static Object player() {",
      "        return Minecraft.getInstance().player;",
      "    }",
      "}"),
  }));
  assert.ok(findingIds(r).includes("client-import-in-common"));
  assert.ok(findingIds(r).includes("minecraft-getinstance-in-common"));
});

test("client import used only inside a Dist.CLIENT class is not reported", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/Events.java`]: java(
      "package com.example.testmod;",
      "import net.minecraft.client.Minecraft;",
      "public class Events {",
      "    @EventBusSubscriber(modid = \"testmod\", value = Dist.CLIENT)",
      "    public static class ClientEvents {",
      "        public static void setup() {",
      "            Minecraft.getInstance();",
      "        }",
      "    }",
      "}"),
  }));
  assert.ok(!findingIds(r).includes("client-import-in-common"));
  assert.ok(r.review_points["client-imports-guarded"]?.length > 0);
});

test("a class that is itself a renderer may import client classes", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/ThingRenderer.java`]: java(
      "package com.example.testmod;",
      "import com.mojang.blaze3d.vertex.PoseStack;",
      "public class ThingRenderer implements BlockEntityRenderer<Thing> {",
      "    public void render(PoseStack pose) {",
      "    }",
      "}"),
  }));
  assert.ok(!findingIds(r).includes("client-import-in-common"));
});

// ---------------------------------------------------------------- mixins

test("@Overwrite is reported", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/mixin/FuelMixin.java`]: java(
      "package com.example.testmod.mixin;",
      "@Mixin(AbstractFurnaceBlockEntity.class)",
      "public class FuelMixin {",
      "    @Overwrite",
      "    protected int getBurnDuration(ItemStack fuel) { return 0; }",
      "}"),
  }));
  assert.ok(findingIds(r).includes("mixin-overwrite"));
});

test("client mixin declared with a string target in the common list is reported", () => {
  const r = scanFiles(neoforgeMod({
    "src/main/resources/testmod.mixins.json": JSON.stringify({
      package: "com.example.testmod.mixin", mixins: ["TitleMixin"], injectors: { defaultRequire: 1 },
    }),
    [`${SRC}/mixin/TitleMixin.java`]: java(
      "package com.example.testmod.mixin;",
      '@Mixin(targets = "net.minecraft.client.Minecraft")',
      "public class TitleMixin {",
      "}"),
  }));
  assert.ok(findingIds(r).includes("client-mixin-in-common-list"));
});

// ---------------------------------------------------------------- data

test("pre-1.21 data folder is reported on 1.21", () => {
  const r = scanFiles(neoforgeMod({ "src/main/resources/data/testmod/recipes/thing.json": "{}" }));
  assert.ok(findingIds(r).includes("legacy-data-folder"));
});

test("pre-1.21 data folder is fine on 1.20.1", () => {
  const files = neoforgeMod({ "src/main/resources/data/testmod/recipes/thing.json": "{}" });
  files["gradle.properties"] = "minecraft_version=1.20.1\nmod_id=testmod\n";
  assert.ok(!findingIds(scanFiles(files)).includes("legacy-data-folder"));
});

test("data key that no codec reads is reported, with a snake_case hint", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/CowDefinition.java`]: java(
      "package com.example.testmod;",
      "public record CowDefinition(double breedChance) {",
      '    static final Object CODEC = Codec.DOUBLE.optionalFieldOf("breed_chance", 1.0);',
      "}"),
    "src/main/resources/data/testmod/cows/tin.json": '{ "breedChance": 0.2 }',
  }));
  const hits = r.findings["data-key-mismatch"]?.hits ?? [];
  assert.equal(hits.length, 1);
  assert.match(hits[0].code, /did you mean 'breed_chance'/);
});

test("loot table pointing to an unknown id of the mod is reported", () => {
  const r = scanFiles(neoforgeMod({
    "src/main/resources/assets/testmod/models/item/diamond_furnace.json": '{ "parent": "minecraft:item/generated" }',
    "src/main/resources/data/testmod/loot_table/blocks/diamond_furnace.json": JSON.stringify({
      type: "minecraft:block", pools: [{ entries: [{ type: "minecraft:item", name: "testmod:diamond_furnance" }] }],
    }),
  }));
  assert.ok(findingIds(r).includes("unknown-id-in-data"));
});

// ---------------------------------------------------------------- registration and config

test("config spec registered twice is reported", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/Setup.java`]: java(
      "package com.example.testmod;",
      "public class Setup {",
      "    void init(ModContainer c) {",
      "        c.registerConfig(ModConfig.Type.COMMON, Config.SPEC);",
      "        c.registerConfig(ModConfig.Type.SERVER, Config.SPEC);",
      "    }",
      "}"),
  }));
  assert.equal(r.findings["config-registered-twice"]?.hits.length, 2);
});

test("registration that depends on installed mods is reported", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/ModFluids.java`]: java(
      "package com.example.testmod;",
      "public class ModFluids {",
      '    static final Object ZINC = ModList.get().isLoaded("create") ? register("molten_zinc") : null;',
      "}"),
  }));
  assert.ok(findingIds(r).includes("conditional-registration"));
});

// ---------------------------------------------------------------- performance and leaks

test("synced entity data changed in a tick method is reported", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/MaterialCow.java`]: java(
      "package com.example.testmod;",
      "public class MaterialCow extends Cow {",
      "    public void setCooldown(int t) {",
      "        this.entityData.set(COOLDOWN, t);",
      "    }",
      "    @Override",
      "    public void aiStep() {",
      "        setCooldown(getCooldown() - 1);",
      "    }",
      "}"),
  }));
  assert.ok(findingIds(r).includes("synced-data-set-in-tick"));
});

test("block update sent from onContentsChanged is reported", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/MachineBlockEntity.java`]: java(
      "package com.example.testmod;",
      "public class MachineBlockEntity {",
      "    final Object tank = new FluidTank(8000) {",
      "        protected void onContentsChanged() {",
      "            level.sendBlockUpdated(worldPosition, getBlockState(), getBlockState(), 3);",
      "        }",
      "    };",
      "}"),
  }));
  assert.ok(findingIds(r).includes("block-update-on-content-change"));
});

test("static map of players is reported, a static method returning a list is not", () => {
  const r = scanFiles(neoforgeMod({
    [`${SRC}/Boosts.java`]: java(
      "package com.example.testmod;",
      "public class Boosts {",
      "    private static final Map<Player, Integer> USED = new HashMap<>();",
      "    private static List<ItemStack> buildList(int size) {",
      "        return List.of();",
      "    }",
      "}"),
  }));
  const hits = r.findings["static-collection-of-game-objects"]?.hits ?? [];
  assert.equal(hits.length, 1);
  assert.match(hits[0].location, /Boosts\.java:3$/);
});

// ---------------------------------------------------------------- assets

test("model pointing to a missing texture and texture without model are reported", () => {
  const r = scanFiles(neoforgeMod({
    "src/main/resources/assets/testmod/models/item/thing.json": '{ "textures": { "layer0": "testmod:item/thing" } }',
    "src/main/resources/assets/testmod/textures/item/orphan.png": "png",
  }));
  assert.ok(findingIds(r).includes("model-missing-texture"));
  assert.ok(findingIds(r).includes("texture-without-model"));
});

// ---------------------------------------------------------------- project layouts

test("multiloader modules are scanned and Fabric mod id comes from fabric.mod.json", () => {
  const r = scanFiles({
    "gradle.properties": "minecraft_version=1.21.1\n",
    "fabric/build.gradle": "plugins { id 'fabric-loom' }\n",
    "fabric/src/main/resources/fabric.mod.json": '{ "id": "multimod" }',
    "common/src/main/java/com/example/multi/Common.java": java(
      "package com.example.multi;",
      "public class Common {",
      "    @Overwrite",
      "    void x() {}",
      "}"),
  });
  assert.equal(r.inventory.mod_id, "multimod");
  assert.ok(r.inventory.modules.includes("common"));
  assert.ok(findingIds(r).includes("mixin-overwrite"));
});

test("files inside .modsmith (reports, backups) are ignored", () => {
  const r = scanFiles(neoforgeMod({
    [`.modsmith/backup/${SRC}/Old.java`]: java("package x;", "class Old {", "    @Overwrite", "    void y() {}", "}"),
  }));
  assert.deepEqual(findingIds(r), []);
});
