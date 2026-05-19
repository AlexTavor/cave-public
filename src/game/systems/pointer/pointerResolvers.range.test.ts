import { describe, expect, it } from "vitest";
import { resolveNearestTarget } from "./pointerResolvers";

describe("resolveNearestTarget range", () => {
    it("treats a node as in range when its edge touches the pointer radius", () => {
        expect(
            resolveNearestTarget({
                targets: [
                    { id: "node-1", x: 112, y: 0, radius: 12, kind: "power" },
                ],
                pointerX: 0,
                pointerY: 0,
                radius: 100,
            }),
        ).toMatchObject({ id: "node-1" });
    });

    it("keeps a node out of range until its edge reaches the pointer radius", () => {
        expect(
            resolveNearestTarget({
                targets: [
                    { id: "node-1", x: 113, y: 0, radius: 12, kind: "power" },
                ],
                pointerX: 0,
                pointerY: 0,
                radius: 100,
            }),
        ).toBeNull();
    });
});
