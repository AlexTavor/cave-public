import { describe, expect, it } from "vitest";
import { resolveNodeOverlayThrottle } from "./resolveNodeOverlayThrottle";

const entities = [
    { id: "mid", parent: { parentId: "root" }, powerSink: { throttle: 0.4 } },
    { id: "child", parent: { parentId: "mid" } },
] as any[];

describe("resolveNodeOverlayThrottle", () => {
    it("matches the runtime fallback when a shared entity index is supplied", () => {
        const child = entities[1];
        const runtime = { getEntities: () => entities } as any;
        const entityById = new Map(
            entities.map((entity) => [entity.id, entity]),
        );
        expect(
            resolveNodeOverlayThrottle(child, runtime, entityById),
        ).toBeCloseTo(resolveNodeOverlayThrottle(child, runtime));
        expect(resolveNodeOverlayThrottle(child, runtime)).toBe(0.4);
    });

    it("keeps the cycle-safe traversal behavior", () => {
        const cycle = [
            { id: "a", parent: { parentId: "b" } },
            { id: "b", parent: { parentId: "a" } },
        ];
        expect(
            resolveNodeOverlayThrottle(
                cycle[0] as any,
                { getEntities: () => cycle } as any,
            ),
        ).toBe(0);
    });

    it("falls back to zero when no throttle-bearing ancestor exists", () => {
        expect(
            resolveNodeOverlayThrottle(
                { id: "solo" } as any,
                { getEntities: () => [] } as any,
            ),
        ).toBe(0);
    });
});
