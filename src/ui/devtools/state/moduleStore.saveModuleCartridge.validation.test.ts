import { describe, expect, it, vi } from "vitest";
import { createCartridge } from "../../../engine/test/factories";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { createModuleStore } from "./moduleStore";

describe("saveModuleCartridge validation", () => {
    it("rejects invalid transferNodeRadiusByValue before IO persistence", async () => {
        const saveModule = vi.fn(
            async (_filename: string, module: ModuleCartridge) => module,
        );
        const store = createModuleStore({
            readModule: async () => null,
            saveModule,
        });
        const invalidModule = createCartridge("game_data.json", {
            assets: {
                displays: {
                    ore: {
                        type: "resource",
                        styleId: "ore",
                        glyphKey: "ore",
                        transferNodeRadiusByValue: { minValue: 1 },
                    } as any,
                },
            } as any,
        });
        await expect(
            store.getState().saveModuleCartridge({
                filename: "game_data.json",
                module: invalidModule,
            }),
        ).rejects.toThrow();
        expect(saveModule).not.toHaveBeenCalled();
    });
});
