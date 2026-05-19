import { describe, expect, it } from "vitest";
import { resolveAuthoredWorldPosition } from "../../../../data/schemas/v2/worldPositionDefaults";
import { harvestPositions } from "./layoutPersistence";

describe("layoutPersistence relative positions", () => {
    it("stores world-relative offsets instead of absolute runtime coordinates", () => {
        const runtime = {
            getEntities: () => [{ id: "hero" }],
            getPhysicsBody: () => ({
                position: resolveAuthoredWorldPosition(25, 50),
            }),
        };

        expect(harvestPositions(runtime as any)).toEqual([
            { blueprintId: "hero", x: 25, y: 50 },
        ]);
    });
});
