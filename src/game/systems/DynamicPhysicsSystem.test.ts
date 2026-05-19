import { describe, it, expect } from "vitest";
import { DynamicPhysicsSystem } from "./DynamicPhysicsSystem";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import type { RuntimeEntity } from "../../engine/runtime/types";

const makePhysicsEngine = () => new ImpulseEngine(DEFAULT_IMPULSE_CONFIG);

const makeEntity = (
    id: string,
    current: number,
    capacity: number,
): RuntimeEntity => ({
    id,
    display: {
        label: "Pool",
        display_key: "test",
        radius: {
            min: 10,
            max: 100,
            valueRef: "self.state.val.value",
            maxRef: "self.state.cap.value",
        },
    },
    state: {
        val: { value: current },
        cap: { value: capacity },
    },
    physics: {
        radius: 10, // Initial physics radius
        mass: 1,
        x: 0,
        y: 0,
    },
});

describe("DynamicPhysicsSystem", () => {
    it("scales physics radius based on state", () => {
        const engine = makePhysicsEngine();
        const entity = makeEntity("pool", 50, 100); // 50% full

        // Add body to engine so system can find it
        engine.addBody({
            id: "pool",
            entity: "pool",
            x: 0,
            y: 0,
            mass: 1,
            radius: 10, // Starts at min
            drag: 0.1,
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            isStatic: true,
        });

        const snapshot = new Snapshot([entity], engine);
        const system = new DynamicPhysicsSystem();

        // Tick
        system.tick(snapshot, { enqueue: () => {} } as any, 16);

        const body = engine.getBody("pool");

        // Min 10, Max 100. 50% -> 10 + (90 * 0.5) = 55
        expect(body?.radius).toBeCloseTo(55);
    });

    it("clamps radius to min when empty", () => {
        const engine = makePhysicsEngine();
        const entity = makeEntity("pool", 0, 100);

        engine.addBody({
            id: "pool",
            entity: "pool",
            x: 0,
            y: 0,
            mass: 1,
            radius: 50,
            drag: 0.1,
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            isStatic: true,
        });

        const snapshot = new Snapshot([entity], engine);
        const system = new DynamicPhysicsSystem();

        system.tick(snapshot, { enqueue: () => {} } as any, 16);

        const body = engine.getBody("pool");
        expect(body?.radius).toBe(10); // Min
    });

    it("clamps radius to max when overflowing", () => {
        const engine = makePhysicsEngine();
        const entity = makeEntity("pool", 200, 100); // 200% full

        engine.addBody({
            id: "pool",
            entity: "pool",
            x: 0,
            y: 0,
            mass: 1,
            radius: 10,
            drag: 0.1,
            position: { x: 0, y: 0 },
            prevPosition: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            isStatic: true,
        });

        const snapshot = new Snapshot([entity], engine);
        const system = new DynamicPhysicsSystem();

        system.tick(snapshot, { enqueue: () => {} } as any, 16);

        const body = engine.getBody("pool");
        expect(body?.radius).toBe(100); // Max
    });
});
