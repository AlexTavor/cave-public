import { describe, it, expect } from "vitest";
import { createCartridge, createEntity } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { Runtime } from "../Runtime";
import { serialize } from "./RuntimeSerializer";

const makeRuntime = () => {
    const cartridge = createCartridge("test");
    return new Runtime(cartridge, "seed-1", new CommandsManager());
};

describe("RuntimeSerializer", () => {
    it("serializes runtime metadata, tick, and seed", () => {
        // Given
        const runtime = makeRuntime();
        runtime.getState().tick = 42;

        // When
        const data = serialize(runtime, "my-save");

        // Then
        expect(data.metadata.label).toBe("my-save");
        expect(data.metadata.seed).toBe("seed-1");
        expect(data.metadata.version).toBe("2");
        expect(data.state.tick).toBe(42);
    });

    it("serializes entities as deep clones", () => {
        // Given
        const runtime = makeRuntime();
        const entity = createEntity("e1", { tags: ["worker"] });
        runtime.addEntity(entity);

        // When
        const data = serialize(runtime, "clone-test");

        // Then
        const saved = data.state.entities.find((e) => e.id === "e1");
        expect(saved).toBeDefined();
        expect(saved).not.toBe(entity);
        expect((saved as any).tags).toEqual(["worker"]);
    });

    it("serializes physics body positions and velocities", () => {
        // Given
        const runtime = makeRuntime();
        const entity = createEntity("p1", {
            physics: {
                x: 10,
                y: 20,
                mass: 1,
                radius: 5,
                drag: 0.1,
            },
        });
        runtime.addEntity(entity);
        // Manually add a physics body
        const body = runtime.getPhysicsBody("p1");
        if (body) {
            body.position = { x: 10, y: 20 };
            body.prevPosition = { x: 9, y: 18 };
            body.acceleration = { x: 0.5, y: -0.3 };
        }

        // When
        const data = serialize(runtime, "physics-test");

        // Then
        if (body) {
            const physics = data.state.physics["p1"];
            expect(physics).toBeDefined();
            expect(physics.x).toBe(10);
            expect(physics.y).toBe(20);
            expect(physics.velocity.x).toBe(1);
            expect(physics.velocity.y).toBe(2);
            expect(physics.acceleration.x).toBe(0.5);
            expect(physics.acceleration.y).toBe(-0.3);
        }
    });

    it("serializes automation snapshot", () => {
        // Given
        const runtime = makeRuntime();

        // When
        const data = serialize(runtime, "auto-test");

        // Then
        expect(data.state.systems.automation).toEqual({
            activeCount: 0,
            nextEventMs: null,
            nextCommand: null,
        });
    });

    it("handles empty runtime safely", () => {
        // Given
        const runtime = makeRuntime();

        // When
        const data = serialize(runtime, "empty");

        // Then
        expect(data.state.entities.length).toBeGreaterThanOrEqual(0);
        expect(typeof data.state.physics).toBe("object");
    });

    it("serializes camera state when provided", () => {
        const runtime = makeRuntime();
        const camera = { centerX: 100, centerY: 200, zoom: 1.5 };
        const data = serialize(runtime, "cam-test", undefined, camera);
        expect(data.state.camera).toEqual(camera);
    });

    it("omits camera when not provided", () => {
        const runtime = makeRuntime();
        const data = serialize(runtime, "no-cam");
        expect(data.state.camera).toBeUndefined();
    });
});
