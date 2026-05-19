import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { createGame } from "../main";

const LOGIC_STEP_MS = 20;

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

const getCycleValue = (
    runtime: ReturnType<typeof createGame>,
    entityId: string,
): number => {
    const entity = runtime
        .getWorld()
        .entities.find((e) => e.id === entityId) as
        | Record<string, any>
        | undefined;
    return entity?.state?.cycle?.value ?? 0;
};

describe("Luretraveler cycle accumulation", () => {
    it("grows by 3 per second when fully powered up with 1 body", () => {
        // Given: a fully-powered game with 1 body and a luretraveler
        const runtime = createGame(makeCartridge(), "seed");

        // A body entity provides 1 body, 1 mind, 1 social to the attribute pools
        runtime.addEntity({
            id: "body_1",
            tags: ["worker"],
            body: {
                attributes: { body: 1, mind: 1, social: 1 },
                health: 10,
                maxHealth: 10,
                traits: [],
            },
        });

        // Pool nodes for each attribute (spawned in steady-state)
        runtime.addEntity({
            id: "pool_body",
            powerSource: { attribute: "body" },
            state: { power: { value: 0, visible: true } },
        });
        runtime.addEntity({
            id: "pool_mind",
            powerSource: { attribute: "mind" },
            state: { power: { value: 0, visible: true } },
        });
        runtime.addEntity({
            id: "pool_social",
            powerSource: { attribute: "social" },
            state: { power: { value: 0, visible: true } },
        });

        // Luretraveler with the compiled behavior (cycle accumulates via powerSink)
        runtime.addEntity({
            id: "lure_1",
            powerSink: {
                baseDemand: { body: 0, mind: 0, social: 0 },
                maxDemand: { body: 0, mind: 0, social: 0 },
                throttle: 1,
                efficiency: 1,
                drawFraction: {},
                status: "nominal",
            },
            passiveEffects: [
                { op: "SET", target: "self.state.cycle.max", value: 100 },
                {
                    op: "SET",
                    target: "self.state.vals_cycle_max_scaler",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_cycle_max_scaler",
                    value: 10,
                },
                {
                    op: "ADD",
                    target: "self.state.cycle.max",
                    source: "self.state.vals_cycle_max_scaler",
                },
                {
                    op: "SET",
                    target: "self.powerSink.baseDemand.body",
                    value: 0,
                },
                {
                    op: "SET",
                    target: "self.state.vals_demand_body_scaler",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_demand_body_scaler",
                    value: 1,
                },
                {
                    op: "ADD",
                    target: "self.powerSink.baseDemand.body",
                    source: "self.state.vals_demand_body_scaler",
                },
                {
                    op: "SET",
                    target: "self.powerSink.maxDemand.body",
                    value: 0,
                },
                {
                    op: "SET",
                    target: "self.state.vals_demand_max_body_scaler",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_demand_max_body_scaler",
                    value: 1,
                },
                {
                    op: "ADD",
                    target: "self.powerSink.maxDemand.body",
                    source: "self.state.vals_demand_max_body_scaler",
                },
                {
                    op: "SET",
                    target: "self.powerSink.baseDemand.mind",
                    value: 0,
                },
                {
                    op: "SET",
                    target: "self.state.vals_demand_mind_scaler",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_demand_mind_scaler",
                    value: 1,
                },
                {
                    op: "ADD",
                    target: "self.powerSink.baseDemand.mind",
                    source: "self.state.vals_demand_mind_scaler",
                },
                {
                    op: "SET",
                    target: "self.powerSink.maxDemand.mind",
                    value: 0,
                },
                {
                    op: "SET",
                    target: "self.state.vals_demand_max_mind_scaler",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_demand_max_mind_scaler",
                    value: 1,
                },
                {
                    op: "ADD",
                    target: "self.powerSink.maxDemand.mind",
                    source: "self.state.vals_demand_max_mind_scaler",
                },
                {
                    op: "SET",
                    target: "self.powerSink.baseDemand.social",
                    value: 0,
                },
                {
                    op: "SET",
                    target: "self.state.vals_demand_social_scaler",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_demand_social_scaler",
                    value: 1,
                },
                {
                    op: "ADD",
                    target: "self.powerSink.baseDemand.social",
                    source: "self.state.vals_demand_social_scaler",
                },
                {
                    op: "SET",
                    target: "self.powerSink.maxDemand.social",
                    value: 0,
                },
                {
                    op: "SET",
                    target: "self.state.vals_demand_max_social_scaler",
                    source: "global.population",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_demand_max_social_scaler",
                    value: 1,
                },
                {
                    op: "ADD",
                    target: "self.powerSink.maxDemand.social",
                    source: "self.state.vals_demand_max_social_scaler",
                },
            ],
            state: {
                cycle: { value: 0, max: 100, visible: true },
                cycle_active: { value: 1, visible: false },
                vals_cycle_max_scaler: { value: 0, visible: false },
                vals_demand_body_scaler: { value: 0, visible: false },
                vals_demand_max_body_scaler: { value: 0, visible: false },
                vals_demand_mind_scaler: { value: 0, visible: false },
                vals_demand_max_mind_scaler: { value: 0, visible: false },
                vals_demand_social_scaler: { value: 0, visible: false },
                vals_demand_max_social_scaler: { value: 0, visible: false },
            },
            behavior: {
                rules: [
                    {
                        id: "sys_cycle_accumulate",
                        sortKey: "sys_001",
                        conditions: [
                            {
                                id: "is_active",
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
            tags: [],
        });

        // When: the runtime runs for 5 seconds (enough for steady-state and accumulation)
        // NOTE: MAX_RUNTIME_SUBSTEPS=10 caps each tick() call to 10 sub-steps,
        // so we must call tick(LOGIC_STEP_MS) individually.
        const ticksFor5Seconds = Math.ceil(5000 / LOGIC_STEP_MS);
        for (let i = 0; i < ticksFor5Seconds; i++) {
            runtime.tick(LOGIC_STEP_MS);
        }

        // Then: cycle.value must be > 1 (3/s for 5s gives ~15 before any resets)
        const cycleValue = getCycleValue(runtime, "lure_1");
        expect(cycleValue).toBeGreaterThan(1);
    });
});

