import { describe, expect, it } from "vitest";
import { PositionHandler } from "./PositionHandler";
import { makeHandlerContext } from "./handlerTestUtils";
import { RuntimeCommandType, type RuntimeEntity } from "../types";

describe("PositionHandler", () => {
    it("updates physics bodies in place", () => {
        const handler = new PositionHandler();
        const context = makeHandlerContext();
        const entity: RuntimeEntity = {
            id: "e1",
            physics: { x: 1, y: 2 },
        } as RuntimeEntity;
        context.world.add(entity);
        context.impulseEngine.addBody({
            id: "e1",
            entity: "e1",
            x: 1,
            y: 2,
            mass: 1,
            radius: 1,
            drag: 0,
            position: { x: 1, y: 2 },
            prevPosition: { x: 1, y: 2 },
            acceleration: { x: 3, y: 4 },
            isStatic: false,
        });
        const body = context.impulseEngine.getBody("e1");
        if (!body) throw new Error("Expected physics body for e1");
        const positionRef = body.position;
        const prevRef = body.prevPosition;
        const accelRef = body.acceleration;

        handler.handle(
            {
                type: RuntimeCommandType.POSITION_ENTITY,
                payload: { id: "e1", x: 8, y: 9 },
            },
            context,
        );

        expect(body.position).toBe(positionRef);
        expect(body.prevPosition).toBe(prevRef);
        expect(body.acceleration).toBe(accelRef);
        expect(body.position).toEqual({ x: 8, y: 9 });
        expect(body.prevPosition).toEqual({ x: 8, y: 9 });
        expect(body.acceleration).toEqual({ x: 0, y: 0 });
    });

    it("skips identical positions without telemetry noise", () => {
        const handler = new PositionHandler();
        const context = makeHandlerContext();
        context.world.add({
            id: "e1",
            physics: { x: 5, y: 6 },
        } as RuntimeEntity);

        handler.handle(
            {
                type: RuntimeCommandType.POSITION_ENTITY,
                payload: { id: "e1", x: 5, y: 6 },
            },
            context,
        );

        expect(context.telemetry.log).not.toHaveBeenCalled();
    });
});
