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

const readCycle = (runtime: ReturnType<typeof createGame>, entityId: string) =>
    (
        runtime
            .getWorld()
            .entities.find((entity) => entity.id === entityId) as any
    )?.state?.cycle?.value ?? 0;

describe("assigned body cycle integration", () => {
    it("keeps assigned bodies contributing power so station cycles still advance", () => {
        const runtime = createGame(makeCartridge(), "seed");
        runtime.addEntity({
            id: "body_1",
            body: {
                attributes: { body: 1, mind: 1, social: 1 },
                baseAttributes: { body: 1, mind: 1, social: 1 },
                health: 10,
                maxHealth: 10,
                traits: [],
                assignmentId: "egg",
                assignmentStatus: "orbiting",
            },
        });
        runtime.addEntity({
            id: "egg",
            assignment: { assignedIds: ["body_1"] },
            powerSink: {
                baseDemand: { body: 1, mind: 1, social: 1 },
                maxDemand: { body: 1, mind: 1, social: 1 },
                throttle: 1,
                efficiency: 1,
                drawFraction: {},
                status: "nominal",
            },
            state: {
                cycle: { value: 0, max: 100, visible: true },
                cycle_active: { value: 1, visible: false },
            },
            behavior: {
                rules: [
                    {
                        id: "grow",
                        sortKey: "0",
                        conditions: [
                            {
                                id: "active",
                                sortKey: "0",
                                tokens: [
                                    { t: "ref", v: "self.state.cycle_active" },
                                ],
                            },
                        ],
                        actions: [
                            {
                                type: "MUTATE",
                                target: "self.state.cycle.value",
                                op: "ADD",
                                value: "(self.powerSink.allocatedDraw.body + self.powerSink.allocatedDraw.mind + self.powerSink.allocatedDraw.social) * global.dt_s",
                            },
                        ],
                    },
                ],
            },
        });

        for (let i = 0; i < 20; i++) runtime.tick(20);

        expect(readCycle(runtime, "egg")).toBeGreaterThan(0);
    });
});
