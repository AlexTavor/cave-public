import { describe, expect, it } from "vitest";
import { createGame } from "./main";
import type { ModuleCartridge } from "../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../data/schemas/assets";

const makeCartridge = (): ModuleCartridge => ({
    metadata: { id: "test", name: "Test", version: "0.0.1" },
    blueprints: {},
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

describe("larder transfer arrival", () => {
    it("credits storage state on the same tick the transfer arrives", () => {
        const runtime = createGame(makeCartridge(), "seed");
        runtime.addEntity({
            id: "larder_1",
            state: {
                food: { value: 0, max: 1200, visible: true },
                vals_entropy_food_0: { value: 1, visible: false },
                vals_entropy_tick_food_0: { value: 0, visible: false },
            },
            passiveEffects: [
                {
                    op: "SET",
                    target: "self.state.vals_entropy_tick_food_0.value",
                    source: "global.dt_s",
                },
                {
                    op: "MULT",
                    target: "self.state.vals_entropy_tick_food_0.value",
                    source: "self.state.vals_entropy_food_0.value",
                },
                {
                    op: "SUB",
                    target: "self.state.food.value",
                    source: "self.state.vals_entropy_tick_food_0.value",
                },
            ],
            ledger: { incoming: { food: 100 } },
        } as any);
        runtime.addEntity({
            id: "pending_food",
            transfer: {
                sourceId: "src",
                targetId: "larder_1",
                payload: { food: 100 },
                status: "pending",
            },
            physics: {
                mass: 1,
                radius: 4,
                drag: 0,
                isStatic: false,
                x: 0,
                y: 0,
            },
        } as any);
        runtime.registerPhysicsBody({
            id: "pending_food",
            entity: "pending_food",
            x: 0,
            y: 0,
            mass: 1,
            radius: 4,
            drag: 0,
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            isStatic: false,
            targetId: "larder_1",
        } as any);
        runtime.registerPhysicsBody({
            id: "larder_1",
            entity: "larder_1",
            x: 0,
            y: 0,
            mass: 1,
            radius: 20,
            drag: 0,
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            isStatic: true,
        } as any);

        runtime.tick(20);

        const larder = runtime.getEntity("larder_1") as any;
        expect(larder?.state?.food?.value).toBeGreaterThan(99);
        expect(larder?.ledger?.incoming?.food).toBe(0);
        expect(runtime.getEntity("pending_food")).toBeUndefined();
    });
});
