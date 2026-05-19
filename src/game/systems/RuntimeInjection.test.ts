import { describe, it, expect } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { createGameRuntime } from "../../engine/runtime/createGameRuntime";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { PassiveEffectsSystem } from "./passive-effects/PassiveEffectSystem";
import { Op } from "../../data/schemas/primitives";

const makeModule = (): ModuleCartridge => ({
    metadata: { id: "core.json", name: "Core", version: "0.0.1" },
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

const getStateValue = (runtime: ReturnType<typeof createGameRuntime>) => {
    const entity = runtime.getEntity("producer") as any;
    const entry = entity?.state?.speed;
    return typeof entry?.value === "number" ? entry.value : 0;
};

describe("Runtime injection", () => {
    it("applies and removes injected buffs", () => {
        const runtime = createGameRuntime(makeModule(), "seed");
        runtime.registerSystem(
            new PassiveEffectsSystem(runtime.getGlobalEffectsIndexer()),
        );

        runtime.addEntity({
            id: "producer",
            tags: ["producer"],
            state: { speed: { value: 10 } },
            passiveEffects: [
                { op: Op.SET, target: "self.state.speed.value", value: 10 },
            ],
        });

        runtime.addEntity({
            id: "bellows",
            buffs: {
                buffs: [
                    {
                        targetTag: "producer",
                        effects: [
                            {
                                op: Op.MULT,
                                target: "self.state.speed.value",
                                value: 2,
                            },
                        ],
                    },
                ],
            },
        });

        runtime.tick(40);
        expect(getStateValue(runtime)).toBe(20);

        runtime.commands.enqueue({
            type: RuntimeCommandType.KILL,
            payload: { entityId: "bellows" },
        });
        runtime.tick(40);
        expect(getStateValue(runtime)).toBe(10);
    });
});

