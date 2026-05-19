// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { createModuleStore } from "./moduleStore";
import { useShellStore } from "../shell/shell";
import { createBlueprint } from "../../../engine/test/factories";
import {
    createMemoryIO,
    makeModule,
} from "./moduleStore.sanitization.testUtils";

describe("ui/devtools/state/moduleStore sanitization", () => {
    beforeEach(() => {
        useShellStore.setState({ log: vi.fn() } as any);
    });

    it("removes invalid abilities on blueprint save and warns", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game_data.json": makeModule({}),
        };
        const store = createModuleStore(createMemoryIO(disk));

        await store.getState().saveBlueprint({
            filename: "game_data.json",
            blueprintId: "entity_a",
            blueprint: createBlueprint("entity_a", {
                label: "Alpha",
                _editor: {
                    abilities: {
                        storage: [
                            {
                                resource: "",
                                capacity: {
                                    base: 3,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                isDefault: true,
                                entropy: {
                                    base: 0,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                visible: true,
                                allowDeposit: true,
                                allowWithdraw: true,
                                priority: 0,
                            },
                        ],
                        conversion: [
                            {
                                id: "bad",
                                inputs: [
                                    {
                                        resource: "",
                                        amount: {
                                            base: 1,
                                            perBody: 0,
                                            multPerBody: 0,
                                        },
                                    },
                                ],
                                outputs: [],
                                resetCycle: true,
                                conditions: [],
                            },
                        ],
                        triggeredActions: [
                            {
                                id: "ta-empty",
                                triggers: ["cycle_complete"],
                                conditions: [],
                                actions: [],
                            },
                        ],
                    },
                },
            }),
        });

        const saved = disk["game_data.json"].blueprints.entity_a;
        expect(saved._editor?.abilities?.storage).toBeUndefined();
        expect(saved._editor?.abilities?.conversion).toBeUndefined();
        expect(saved._editor?.abilities?.triggeredActions).toBeUndefined();
        expect(useShellStore.getState().log).toHaveBeenCalledWith(
            "info",
            expect.stringContaining("Alpha"),
        );
    });
});

