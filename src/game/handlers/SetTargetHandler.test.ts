import { describe, expect, it } from "vitest";
import { SetTargetHandler } from "./SetTargetHandler";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";

const makeBody = (id: string) => ({
    id,
    entity: id,
    x: 0,
    y: 0,
    mass: 1,
    radius: 10,
    drag: 0.1,
    position: { x: 0, y: 0 },
    prevPosition: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    isStatic: false,
});

describe("SetTargetHandler", () => {
    it("updates impulse target for the entity", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "body-1" });
        context.impulseEngine.addBody(makeBody("body-1"));

        const handler = new SetTargetHandler();
        handler.handle(
            {
                type: RuntimeCommandType.SET_TARGET,
                payload: { entityId: "body-1", targetId: "station-1" },
            },
            context,
        );

        expect(context.impulseEngine.getBody("body-1")?.targetId).toBe(
            "station-1",
        );
    });

    it("logs an error when entity is missing", () => {
        const context = makeHandlerContext();
        const handler = new SetTargetHandler();

        handler.handle(
            {
                type: RuntimeCommandType.SET_TARGET,
                payload: { entityId: "missing", targetId: "station-1" },
            },
            context,
        );

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("missing"),
        );
    });
});
