import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeEntity } from "../types";
import {
    buildPayloadLabel,
    buildPendingBody,
    resolvePhysicsPosition,
} from "./transferUtils";
import {
    PHYSICS_DEFAULT_DRAG,
    PHYSICS_DEFAULT_MASS,
} from "../../../data/schemas/physics";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("transferBodies helpers", () => {
    it("formats labels and resolves physics positions", () => {
        expect(buildPayloadLabel({})).toBe("Transfer");
        expect(buildPayloadLabel({ wood: 2, stone: 1 })).toBe(
            "2 wood, 1 stone",
        );
        expect(
            resolvePhysicsPosition({
                id: "a",
                physics: { nope: true },
            } as RuntimeEntity),
        ).toBeNull();
        expect(
            resolvePhysicsPosition({
                id: "a",
                physics: { x: 10, y: 20 },
            } as RuntimeEntity),
        ).toEqual({ x: 10, y: 20 });
    });

    it("builds pending bodies with deterministic, seeded initial motion", () => {
        const make = () =>
            buildPendingBody("pending", { x: 10, y: 20 }, {
                mass: PHYSICS_DEFAULT_MASS,
                radius: 12,
                drag: PHYSICS_DEFAULT_DRAG,
                impulseMagnitude: 5,
            });
        const body = make();

        expect(body.id).toBe("pending");
        expect(body.position).toEqual({ x: 10, y: 20 });
        expect(body.prevPosition).toEqual({ x: 10, y: 20 });
        // Velocity is seeded from the body id (no Math.random), so it replays identically...
        expect(make().velocity).toEqual(body.velocity);
        // ...with speed in the [0.6, 1.0) * (impulseMagnitude * 60) band.
        const speed = Math.hypot(body.velocity?.x ?? 0, body.velocity?.y ?? 0);
        expect(speed).toBeGreaterThanOrEqual(180);
        expect(speed).toBeLessThan(300);
    });
});
