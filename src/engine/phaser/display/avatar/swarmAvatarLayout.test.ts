import { describe, expect, it } from "vitest";
import { resolveSwarmAvatarPlacement } from "./swarmAvatarLayout";

describe("resolveSwarmAvatarPlacement", () => {
    it("throws for invalid count or index", () => {
        expect(() =>
            resolveSwarmAvatarPlacement(20, 0, 0, 0, "seed"),
        ).toThrow();
        expect(() =>
            resolveSwarmAvatarPlacement(20, 2, 2, 0, "seed"),
        ).toThrow();
    });

    it("returns bounded deterministic placement data", () => {
        const placement = resolveSwarmAvatarPlacement(30, 4, 1, 500, "seed");

        expect(placement.memberScale).toBeGreaterThanOrEqual(0.12);
        expect(placement.memberScale).toBeLessThanOrEqual(0.56);
        expect(Number.isFinite(placement.x)).toBe(true);
        expect(Number.isFinite(placement.y)).toBe(true);
        expect(Math.hypot(placement.x, placement.y)).toBeLessThan(30);
    });

    it("is deterministic at the same timestamp and moves over time", () => {
        const first = resolveSwarmAvatarPlacement(30, 4, 1, 500, "seed");
        const second = resolveSwarmAvatarPlacement(30, 4, 1, 500, "seed");
        const moved = resolveSwarmAvatarPlacement(30, 4, 1, 1500, "seed");
        expect(first).toEqual(second);
        expect(moved).not.toEqual(first);
    });

    it("keeps small swarms readable", () => {
        const placements = [0, 1, 2, 3].map((index) =>
            resolveSwarmAvatarPlacement(30, 4, index, 900, `seed:${index}`),
        );

        for (const placement of placements) {
            expect(Math.hypot(placement.x, placement.y)).toBeGreaterThan(5);
        }
    });

    it("keeps paired swarms on opposite sides of the node", () => {
        const left = resolveSwarmAvatarPlacement(30, 2, 0, 0, "left");
        const right = resolveSwarmAvatarPlacement(30, 2, 1, 0, "right");

        expect(left.y).toBeLessThan(0);
        expect(right.y).toBeGreaterThan(0);
        expect(left.x * right.x + left.y * right.y).toBeLessThan(0);
    });

    it("compresses larger crowds inward as count grows", () => {
        const sparse = resolveSwarmAvatarPlacement(30, 7, 1, 500, "sparse");
        const dense = resolveSwarmAvatarPlacement(30, 40, 1, 500, "dense");

        expect(Math.hypot(dense.x, dense.y)).toBeLessThan(
            Math.hypot(sparse.x, sparse.y),
        );
    });
});
