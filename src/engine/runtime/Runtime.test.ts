import { describe, it, expect, vi } from "vitest";
import { Runtime } from "./Runtime";
import { CommandsManager } from "./CommandsManager";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { ImpulseEngine } from "../physics/impulse/ImpulseEngine";

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

describe("Runtime", () => {
    it("initializes with tick at 0", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );
        expect(runtime.getState().tick).toBe(0);
        expect(runtime.getEntityCount()).toBe(2);
    });

    it("advances the tick counter", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );
        runtime.tick(20);
        expect(runtime.getState().tick).toBe(1);
    });

    it("clears world entities on destroy", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );
        runtime.addEntity({ id: "entity-1" });
        expect(runtime.getEntityCount()).toBe(3);
        runtime.destroy();
        expect(runtime.getEntityCount()).toBe(0);
    });

    it("processes commands during tick", () => {
        const manager = new CommandsManager();
        const runtime = new Runtime(makeModule(), "seed", manager);
        const spy = vi.spyOn(manager, "process");

        runtime.tick(20);
        expect(spy).toHaveBeenCalled();
    });

    it("scales dt passed to systems", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );
        const tickSpy = vi.spyOn(
            (runtime as any).impulseEngine as ImpulseEngine,
            "tick",
        );

        runtime.setTimeScale(0.5);
        runtime.tick(100);

        const totalDt = tickSpy.mock.calls.reduce((sum, [dt]) => sum + dt, 0);
        expect(totalDt).toBeCloseTo(0.04);
        tickSpy.mockRestore();
    });

    it("skips processing when paused", () => {
        const runtime = new Runtime(
            makeModule(),
            "seed",
            new CommandsManager(),
        );
        const tickSpy = vi.spyOn(
            (runtime as any).impulseEngine as ImpulseEngine,
            "tick",
        );

        runtime.getState().status = "paused";
        runtime.tick(100);

        expect(runtime.getState().tick).toBe(0);
        expect(tickSpy).not.toHaveBeenCalled();
        tickSpy.mockRestore();
    });
});

