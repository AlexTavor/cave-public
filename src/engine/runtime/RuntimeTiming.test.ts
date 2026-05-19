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

describe("Runtime fixed timestep", () => {
    it("accumulates slow timeScale without early ticks", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );

        runtime.setTimeScale(0.1);

        for (let i = 0; i < 10; i += 1) runtime.tick(16);
        expect(runtime.getState().tick).toBe(0);

        for (let i = 0; i < 3; i += 1) runtime.tick(16);
        expect(runtime.getState().tick).toBe(1);
    });

    it("runs multiple steps when fast-forwarded", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );

        runtime.setTimeScale(10);
        runtime.tick(16);

        expect(runtime.getState().tick).toBe(8);
    });

    it("drops accumulated time while paused", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );

        runtime.getState().status = "paused";
        runtime.tick(100);
        expect(runtime.getState().tick).toBe(0);

        runtime.getState().status = "running";
        runtime.tick(20);
        expect(runtime.getState().tick).toBe(1);
    });
});

