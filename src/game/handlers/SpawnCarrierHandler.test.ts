import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { buildPhysicsBody } from "../../engine/runtime/handlers/spawnUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { SpawnCarrierHandler } from "./SpawnCarrierHandler";

describe("SpawnCarrierHandler", () => {
    it("spawns a carrier from sys_world fallback settings", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world" } as any);
        context.impulseEngine.addBody(buildPhysicsBody("sys_world", { x: 4, y: 8, mass: 1, radius: 20, drag: 0.1, isStatic: false } as any));

        new SpawnCarrierHandler().handle(
            {
                type: RuntimeCommandType.SPAWN_CARRIER,
                payload: { id: "carrier-1", tags: ["carrier"], commands: [{ type: "KILL", entityId: "self" }] },
            },
            context,
        );

        expect(context.world.entities.find((entity) => entity.id === "carrier-1")).toMatchObject({
            tags: ["carrier"],
            display: { label: "egg", display_key: "egg" },
        });
        expect(context.impulseEngine.getBody("carrier-1")).toMatchObject({ x: 4, y: 8, radius: 12 });
    });

    it("uses explicit coordinates or source entity metadata when present", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world" } as any);
        context.impulseEngine.addBody(buildPhysicsBody("source", { x: 7, y: 9, mass: 1, radius: 5, drag: 0.1, isStatic: false } as any));

        new SpawnCarrierHandler().handle(
            {
                type: RuntimeCommandType.SPAWN_CARRIER,
                payload: { id: "carrier-a", x: 1, y: 2, tags: ["carrier"], commands: [{ type: "KILL", entityId: "self" }] },
            },
            context,
        );
        new SpawnCarrierHandler().handle(
            {
                type: RuntimeCommandType.SPAWN_CARRIER,
                payload: { id: "carrier-b", tags: ["carrier"], commands: [{ type: "KILL", entityId: "self" }] },
                metadata: { sourceEntityId: "source" },
            },
            context,
        );

        expect(context.impulseEngine.getBody("carrier-a")).toMatchObject({ x: 1, y: 2 });
        expect(context.impulseEngine.getBody("carrier-b")).toMatchObject({ x: 7, y: 9 });
    });
});