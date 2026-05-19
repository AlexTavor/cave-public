import { describe, it, expect } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import type { ModuleStoreIO } from "./moduleStore.io";
import {
    createBlueprint,
    createCartridge,
} from "../../../engine/test/factories";
import { createModuleStore } from "./moduleStore";

const makeModule = (): ModuleCartridge =>
    createCartridge("game.json", {
        blueprints: {
            bp_site: createBlueprint("bp_site", {
                components: {},
                _editor: {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 10,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            costMultPerCycle: 0,
                            inputs: {},
                            oneOff: false,
                            conditions: [],
                        },
                    },
                },
            }),
        },
    });

describe("moduleStore ejectBlueprint", () => {
    it("compiles and removes _editor data", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game.json": makeModule(),
        };
        const io: ModuleStoreIO = {
            readModule: async (filename) => disk[filename] ?? null,
            saveModule: async (filename, moduleData) => {
                disk[filename] = moduleData;
                return moduleData;
            },
        };

        const store = createModuleStore(io);
        await store.getState().ejectBlueprint({
            filename: "game.json",
            blueprintId: "bp_site",
        });

        const blueprint = disk["game.json"].blueprints.bp_site;
        expect(blueprint._editor).toBeUndefined();
        expect(blueprint.components.state?.cycle).toBeDefined();
    });
});
