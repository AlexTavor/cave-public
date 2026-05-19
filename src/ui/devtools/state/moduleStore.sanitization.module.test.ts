// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { createModuleStore } from "./moduleStore";
import { useShellStore } from "../shell/shell";
import { createBlueprint } from "../../../engine/test/factories";
import {
    createMemoryIO,
    makeModule,
    makeStorageAbility,
    makeUpkeepAbility,
} from "./moduleStore.sanitization.testUtils";

describe("ui/devtools/state/moduleStore module sanitization", () => {
    beforeEach(() => {
        useShellStore.setState({ log: vi.fn() } as any);
    });

    it("removes invalid abilities on module save and warns", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game_data.json": makeModule({}),
        };
        const store = createModuleStore(createMemoryIO(disk));

        const module = makeModule({
            entity_a: createBlueprint("entity_a", {
                _editor: {
                    abilities: {
                        storage: [
                            makeStorageAbility("", 10),
                            makeStorageAbility("water", 5),
                        ],
                        production: [
                            {
                                resource: " ",
                                amount: { base: 1, perBody: 0, multPerBody: 0 },
                                conditions: [],
                            },
                        ],
                        upkeep: [
                            makeUpkeepAbility(" ", 1),
                            makeUpkeepAbility("food", 2),
                        ],
                        conversion: [
                            {
                                id: "bad",
                                inputs: [
                                    {
                                        resource: "water",
                                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                                    },
                                ],
                                outputs: [
                                    {
                                        resource: "",
                                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                                    },
                                ],
                                resetCycle: true,
                                conditions: [],
                            },
                            {
                                id: "ok",
                                inputs: [
                                    {
                                        resource: "ore",
                                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                                    },
                                ],
                                outputs: [
                                    {
                                        resource: "metal",
                                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                                    },
                                ],
                                resetCycle: true,
                                conditions: [],
                            },
                        ],
                    },
                },
            }),
        });

        await store.getState().saveModuleCartridge({
            filename: "game_data.json",
            module,
        });

        const saved = disk["game_data.json"].blueprints.entity_a;
        const abilities = saved._editor?.abilities;
        expect(abilities?.storage?.length).toBe(1);
        expect(abilities?.storage?.[0].resource).toBe("water");
        expect(abilities?.production).toBeUndefined();
        expect(abilities?.upkeep?.length).toBe(1);
        expect(abilities?.upkeep?.[0].resource).toBe("food");
        expect(abilities?.conversion?.length).toBe(1);
        expect(abilities?.conversion?.[0].id).toBe("ok");
        expect(useShellStore.getState().log).toHaveBeenCalledWith(
            "info",
            expect.stringContaining("Removed 4 invalid abilities"),
        );
    });
});
