import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../data/schemas/assets";
import { Op } from "../data/schemas/primitives";
import { createGame } from "./main";

const makeCartridge = (): ModuleCartridge => ({
    metadata: { id: "test", name: "Test", version: "0.0.1" },
    blueprints: {},
    config: {
        traits: {
            healing: {
                id: "healing",
                label: "Healing",
                cycles: [
                    {
                        id: "heal",
                        periodSeconds: 0.1,
                        effects: [
                            {
                                op: Op.ADD,
                                target: "self.state.hp.value",
                                value: 1,
                            },
                        ],
                    },
                ],
            },
        },
        habiti: {},
        understanding: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            contention: [],
        },
    },
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        settings: { vein_network: DEFAULT_VEIN_CONFIG },
    },
});

describe("createGame trait integration", () => {
    it("applies cycle effects from blueprint trait definitions", () => {
        const runtime = createGame(makeCartridge(), "seed");

        runtime.addEntity({
            id: "body_1",
            state: { hp: { value: 10, visible: true } },
            traits: [{ id: "healing" }],
            tags: [],
        });

        runtime.tick(1000);
        runtime.tick(1000);

        const body = runtime
            .getWorld()
            .entities.find((entity) => entity.id === "body_1") as
            | { state?: { hp?: { value?: number } } }
            | undefined;
        expect(body?.state?.hp?.value).toBe(11);
    });
});

