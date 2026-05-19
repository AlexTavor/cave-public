import { describe, it, expect } from "vitest";
import { Runtime } from "./Runtime";
import { CommandsManager } from "./CommandsManager";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";

const makeModule = (): ModuleCartridge => ({
    metadata: {
        id: "core.json",
        name: "Core",
        version: "0.0.1",
    },
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

const makeSetRule = (id: string, key: string) => ({
    id,
    sortKey: `sk_${id}`,
    conditions: [
        {
            id: `${id}-cond`,
            sortKey: `sk_${id}-cond`,
            tokens: [{ t: "val", v: 1 }],
        },
    ],
    actions: [
        {
            type: "MUTATE",
            target: `global.${key}`,
            op: "SET",
            value: 1,
        },
    ],
});

describe("Runtime Safety Valve", () => {
    it("rejects command batches that exceed the budget", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );

        const worldEntity = runtime
            .getWorld()
            .entities.find((entity) => entity.id === "sys_world");

        if (!worldEntity) throw new Error("sys_world missing in test");

        const rules = Array.from({ length: 2001 }, (_, index) =>
            makeSetRule(`rule-${index}`, `key-${index}`),
        );

        (worldEntity as any).behavior = { rules };

        expect(() => runtime.tick(20)).toThrow();
        expect(runtime.getState().tick).toBe(0);
    });
});

