import { describe, it, expect } from "vitest";
import {
    resolveHealthRatio,
    resolveInterval,
    resolveBodyPhysicsPosition,
    DISTRESS_THRESHOLD,
} from "./distressTarget";

describe("resolveHealthRatio", () => {
    it("returns 1 when maxHealth is 0", () => {
        expect(resolveHealthRatio({ maxHealth: 0 } as any)).toBe(1);
    });

    it("returns correct ratio", () => {
        expect(
            resolveHealthRatio({ health: 30, maxHealth: 100 } as any),
        ).toBeCloseTo(0.3);
    });

    it("clamps to [0,1]", () => {
        expect(resolveHealthRatio({ health: 200, maxHealth: 100 } as any)).toBe(
            1,
        );
        expect(resolveHealthRatio({ health: -5, maxHealth: 100 } as any)).toBe(
            0,
        );
    });
});

describe("resolveInterval", () => {
    it("returns shortest interval for lowest ratios", () => {
        expect(resolveInterval(0.05)).toBe(220);
    });

    it("returns longest interval at threshold", () => {
        expect(resolveInterval(DISTRESS_THRESHOLD - 0.01)).toBe(700);
    });
});

describe("resolveBodyPhysicsPosition", () => {
    const makeRuntime = (overrides: {
        physicsMap?: Record<string, any>;
        entities?: any[];
    }) => ({
        getPhysicsBody: (id: string) => overrides.physicsMap?.[id],
        getEntities: () => overrides.entities ?? [],
    });

    it("returns direct physics body position", () => {
        const runtime = makeRuntime({
            physicsMap: { a: { position: { x: 1, y: 2 }, radius: 10 } },
        });
        expect(resolveBodyPhysicsPosition(runtime as any, "a")).toEqual({
            x: 1,
            y: 2,
            radius: 10,
        });
    });

    it("returns null when nothing available", () => {
        const runtime = makeRuntime({ entities: [] });
        expect(resolveBodyPhysicsPosition(runtime as any, "x")).toBeNull();
    });
});

