import { describe, expect, it } from "vitest";
import { PHYSICS_DEFAULT_X, PHYSICS_DEFAULT_Y } from "../physicsConstants";
import { DEFAULT_POINTER_ENTITY } from "./pointerSystemDefaults";
import { DEFAULT_WORLD_ENTITY } from "./systemDefaults";
import {
    AUTHORED_WORLD_POSITION,
    DEFAULT_PHYSICS_POSITION,
    DEFAULT_POINTER_POSITION,
    DEFAULT_WORLD_POSITION,
    resolveAuthoredWorldCoordinates,
    resolveAuthoredWorldPosition,
} from "./worldPositionDefaults";

describe("worldPositionDefaults", () => {
    it("keeps node defaults relative to the world anchor", () => {
        expect({ x: PHYSICS_DEFAULT_X, y: PHYSICS_DEFAULT_Y }).toEqual(
            DEFAULT_PHYSICS_POSITION,
        );
        expect(
            DEFAULT_WORLD_ENTITY.physics as { x: number; y: number },
        ).toEqual(expect.objectContaining(DEFAULT_WORLD_POSITION));
        expect(
            DEFAULT_POINTER_ENTITY.physics as { x: number; y: number },
        ).toEqual(expect.objectContaining(DEFAULT_POINTER_POSITION));
    });

    it("shifts authored node positions by the cave anchor delta", () => {
        expect(resolveAuthoredWorldPosition(2201, 2666)).toEqual({
            x: 2201 + DEFAULT_WORLD_POSITION.x - AUTHORED_WORLD_POSITION.x,
            y: 2666 + DEFAULT_WORLD_POSITION.y - AUTHORED_WORLD_POSITION.y,
        });
        expect(resolveAuthoredWorldCoordinates(4201, 4666)).toEqual({
            x: 4201 - DEFAULT_WORLD_POSITION.x + AUTHORED_WORLD_POSITION.x,
            y: 4666 - DEFAULT_WORLD_POSITION.y + AUTHORED_WORLD_POSITION.y,
        });
    });
});
