import { describe, expect, it } from "vitest";
import { resolveCameraFocusPosition } from "./resolveCameraFocusPosition";

describe("resolveCameraFocusPosition", () => {
    it("prefers direct physics when the focus entity has a body", () => {
        const runtime = {
            getEntity: (id: string) =>
                id === "body-1" ? { id, body: {} } : { id },
            getPhysicsBody: (id: string) => {
                if (id === "body-1")
                    return { position: { x: 14, y: 22 }, x: 14, y: 22 };
                return null;
            },
            getEntities: () => [],
        } as any;

        expect(resolveCameraFocusPosition(runtime, "body-1")).toEqual({
            x: 14,
            y: 22,
        });
    });

    it("returns null when a non-body entity has no direct physics", () => {
        const runtime = {
            getEntity: (id: string) => ({ id }),
            getPhysicsBody: () => null,
            getEntities: () => [],
        } as any;

        expect(resolveCameraFocusPosition(runtime, "node-1")).toBeNull();
    });
});
