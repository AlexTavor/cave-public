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

const makeSetRule = () => ({
    id: "rule",
    sortKey: "sk_rule",
    conditions: [
        { id: "cond", sortKey: "sk_cond", tokens: [{ t: "val", v: 1 }] },
    ],
    actions: [
        {
            type: "MUTATE",
            target: "global.total",
            op: "SET",
            value: 1,
        },
    ],
});

const getGlobal = (runtime: Runtime, key: string): number => {
    const worldEntity = runtime
        .getWorld()
        .entities.find((entity) => entity.id === "sys_world") as any;
    const entry = worldEntity?.state?.[key];
    return typeof entry?.value === "number" ? entry.value : 0;
};

describe("Runtime deterministic replay", () => {
    it("replays deterministically across reloads", () => {
        const runtimeA = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );
        const runtimeB = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );

        const worldEntityA = runtimeA
            .getWorld()
            .entities.find((entity) => entity.id === "sys_world") as any;
        const worldEntityB = runtimeB
            .getWorld()
            .entities.find((entity) => entity.id === "sys_world") as any;

        worldEntityA.behavior = { rules: [makeSetRule()] };
        worldEntityB.behavior = { rules: [makeSetRule()] };

        runtimeA.tick(16);
        runtimeA.tick(16);
        runtimeB.tick(16);
        runtimeB.tick(16);

        expect(getGlobal(runtimeA, "total")).toBe(getGlobal(runtimeB, "total"));
    });
});

