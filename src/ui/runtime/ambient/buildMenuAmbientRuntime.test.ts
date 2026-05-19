import { describe, expect, it, vi } from "vitest";
import { buildMenuAmbientRuntime } from "./buildMenuAmbientRuntime";

type AmbientGameSettings = {
    game_config: { world: { width: number; height: number } };
};

describe("buildMenuAmbientRuntime", () => {
    it("centers seeded system entities inside the viewport", () => {
        vi.stubGlobal("window", { innerWidth: 800, innerHeight: 600 });

        const runtime = buildMenuAmbientRuntime(
            {
                entityCount: 1,
                minSpeedPxPerSecond: 5,
                maxSpeedPxPerSecond: 10,
                speedCurve: "inExpo",
                retargetIntervalMsMin: 1000,
                retargetIntervalMsMax: 1000,
            },
            "seed",
        );

        expect(runtime.getEntity("sys_world")?.physics).toMatchObject({
            x: 400,
            y: 300,
        });
        const settings = (
            runtime.getCartridge().config as { settings: AmbientGameSettings }
        ).settings;
        expect(settings?.game_config.world).toEqual({
            width: 800,
            height: 600,
        });
        runtime.destroy();
        vi.unstubAllGlobals();
    });
});
