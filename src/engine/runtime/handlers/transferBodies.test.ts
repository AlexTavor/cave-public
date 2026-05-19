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

    it("builds pending bodies with deterministic initial motion", () => {
        vi.spyOn(Math, "random").mockReturnValue(0);
        const body = buildPendingBody(
            "pending",
            { x: 10, y: 20 },
            {
                mass: PHYSICS_DEFAULT_MASS,
                radius: 12,
                drag: PHYSICS_DEFAULT_DRAG,
                impulseMagnitude: 5,
            },
        );

        expect(body.id).toBe("pending");
        expect(body.position).toEqual({ x: 10, y: 20 });
        expect(body.prevPosition).toEqual({ x: 10, y: 20 });
        expect(body.velocity?.x).toBeCloseTo(180);
        expect(body.velocity?.y).toBeCloseTo(0);
    });
});
