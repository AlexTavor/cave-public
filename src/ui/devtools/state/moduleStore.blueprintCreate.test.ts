import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { createCartridge } from "../../../engine/test/factories";
import { createModuleStore } from "./moduleStore";
import type { ModuleStoreIO } from "./moduleStore.io";
import { createBlueprintInModule } from "./moduleStore.blueprintCreate";

describe("moduleStore blueprint creation defaults", () => {
    it("seeds new blueprints with spawn and kill animation tags", () => {
        const { updated } = createBlueprintInModule({
            moduleData: createCartridge("game", { blueprints: {} }),
            newId: "entity_test",
            baseLabel: "New Entity",
            icon: "unknown",
        });

        expect(updated.blueprints.entity_test?.tags).toEqual([
            "anim:spawn",
            "anim:kill",
        ]);
    });

    it("persists the default animation tags through createBlueprint", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game.json": createCartridge("game", { blueprints: {} }),
        };
        const io: ModuleStoreIO = {
            readModule: async (filename) => disk[filename] ?? null,
            saveModule: async (filename, moduleData) => {
                disk[filename] = moduleData;
                return moduleData;
            },
        };

        const store = createModuleStore(io);
        const blueprintId = await store.getState().createBlueprint({
            filename: "game.json",
        });

        expect(disk["game.json"].blueprints[blueprintId]?.tags).toEqual([
            "anim:spawn",
            "anim:kill",
        ]);
    });
});
