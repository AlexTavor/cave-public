import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { createGame } from "../main";

const makeCartridge = (): ModuleCartridge => ({
    metadata: { id: "test", name: "Test", version: "0.0.1" },
    blueprints: {},
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        traits: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

const getPurgeProgress = (runtime: ReturnType<typeof createGame>): number => {
    const world = runtime
        .getWorld()
        .entities.find((e) => e.id === "sys_world") as
        | Record<string, any>
        | undefined;
    return world?.state?.purge_progress?.value ?? 0;
};

describe("Luretraveler purge progression integration", () => {
    it("credits sys_world.state.purge_progress.value after a cycle updater", () => {
        const runtime = createGame(makeCartridge(), "seed");

        runtime.addEntity({
            id: "lure_1",
            state: {
                cycle: { value: 100, max: 100, visible: true },
            },
            behavior: {
                rules: [
                    {
                        id: "updater",
                        sortKey: "45_updater_0",
                        conditions: [
                            {
                                id: "cycle_complete",
                                sortKey: "0",
                                tokens: [
                                    { t: "ref", v: "self.state.cycle.value" },
                                    { t: "op", v: ">=" },
                                    { t: "ref", v: "self.state.cycle.max" },
                                ],
                            },
                        ],
                        actions: [
                            {
                                type: "MUTATE",
                                target: "sys_world.state.purge_progress.value",
                                op: "ADD",
                                value: "120",
                            },
                        ],
                    },
                ],
            },
        });

        runtime.tick(20);
        runtime.tick(20);
        runtime.tick(20);

        expect(getPurgeProgress(runtime)).toBeGreaterThanOrEqual(120);
    });
});

