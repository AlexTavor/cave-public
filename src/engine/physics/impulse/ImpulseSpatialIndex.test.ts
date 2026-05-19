import { describe, it, expect } from "vitest";
import { buildSpatialIndex } from "./ImpulseSpatialIndex";
import type { PhysicsBody, Vector2 } from "./types";
import { createImpulseConfig } from "../../test/factories";

const makeBody = (params: {
    id: string;
    position: Vector2;
    layer?: PhysicsBody["layer"];
}): PhysicsBody => ({
    id: params.id,
    entity: params.id,
    x: params.position.x,
    y: params.position.y,
    mass: 1,
    radius: 4,
    drag: 0.1,
    position: { ...params.position },
    prevPosition: { ...params.position },
    acceleration: { x: 0, y: 0 },
    isStatic: false,
    layer: params.layer,
});

describe("ImpulseSpatialIndex", () => {
    it("excludes phantom bodies from spatial queries", () => {
        const bodies = new Map<string, PhysicsBody>([
            ["default", makeBody({ id: "default", position: { x: 0, y: 0 } })],
            [
                "phantom",
                makeBody({
                    id: "phantom",
                    position: { x: 5, y: 0 },
                    layer: "phantom",
                }),
            ],
        ]);

        const spatialIndex = buildSpatialIndex(bodies, createImpulseConfig(), {
            width: 100,
            height: 100,
        });

        expect(spatialIndex).not.toBeNull();
        const buffer: PhysicsBody[] = [];

        try {
            spatialIndex!.tree.queryRadius(0, 0, 20, buffer);
        } finally {
            spatialIndex?.release();
        }

        const ids = buffer.map((body) => body.id);
        expect(ids).toContain("default");
        expect(ids).not.toContain("phantom");
    });
});
