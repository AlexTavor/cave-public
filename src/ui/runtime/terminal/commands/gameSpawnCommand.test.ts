import { describe, it, expect, vi } from "vitest";

const symbolsMock = vi.hoisted(() => vi.fn<() => string[]>(() => []));

vi.mock("../../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: { getSymbols: symbolsMock },
}));
import { gameSpawnCommand } from "./gameSpawnCommand";

describe("gameSpawnCommand", () => {
    it("returns empty suggestions when no modules are available", () => {
        const context: any = { resources: { getModules: () => [] } };
        const suggestions = gameSpawnCommand.autocomplete!([""], context);
        expect(suggestions).toEqual([]);
    });

    it("falls back to workspace symbols when modules are empty", () => {
        symbolsMock.mockReturnValue(["cave_seed"]);
        const context: any = { resources: { getModules: () => [] } };
        const suggestions = gameSpawnCommand.autocomplete!(["c"], context);
        expect(suggestions[0].label).toBe("cave_seed");
    });

    it("returns blueprint suggestions from module cartridges", () => {
        const context: any = {
            resources: {
                getModules: vi.fn().mockReturnValue([
                    {
                        blueprints: {
                            npc_guard: {},
                            npc_villager: {},
                        },
                    },
                    {
                        blueprints: {
                            npc_guard: {},
                            npc_archer: {},
                        },
                    },
                ]),
            },
        };

        const suggestions = gameSpawnCommand.autocomplete!(["npc"], context);

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0].label).toBe("npc_guard");
    });
});
