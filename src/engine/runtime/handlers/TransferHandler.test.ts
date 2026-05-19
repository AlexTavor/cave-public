import { describe, it, expect } from "vitest";
import { TransferHandler } from "./TransferHandler";
import { RuntimeCommandType, type TransferAssetsCommand } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge, createEntity } from "../../test/factories";

const bodiesState = (value: number) => ({
    bodies: { value, visible: false },
});

const transferCommand = (bodies: number) => {
    const command: TransferAssetsCommand = {
        type: RuntimeCommandType.TRANSFER_ASSETS,
        payload: {
            sourceId: "source",
            targetId: "target",
            payload: { bodies },
        },
    };
    return command;
};

describe("TransferHandler", () => {
    it("debits source and spawns pending transfer", () => {
        const handler = new TransferHandler();
        const context = makeHandlerContext(createCartridge("core.json"));

        context.world.add(
            createEntity("source", {
                state: bodiesState(10),
            }),
        );

        context.world.add(
            createEntity("target", {
                state: bodiesState(1),
                physics: { x: 50, y: 50, radius: 12, mass: 1, drag: 0.1 },
            }),
        );
        context.impulseEngine.addBody({
            id: "source",
            entity: "source",
            x: 50,
            y: 50,
            mass: 1,
            radius: 12,
            drag: 0.1,
            position: { x: 50, y: 50 },
            prevPosition: { x: 50, y: 50 },
            acceleration: { x: 0, y: 0 },
            isStatic: false,
        });
        context.impulseEngine.addBody({
            id: "target",
            entity: "target",
            x: 50,
            y: 50,
            mass: 1,
            radius: 12,
            drag: 0.1,
            position: { x: 50, y: 50 },
            prevPosition: { x: 50, y: 50 },
            acceleration: { x: 0, y: 0 },
            isStatic: false,
        });

        handler.handle(transferCommand(5), context);

        const source = context.world.entities.find(
            (entity) => entity.id === "source",
        );
        const sourceState = source?.state as
            | { bodies?: { value: number } }
            | undefined;
        const pending = context.world.entities.find((entity) =>
            entity.id?.startsWith("pending_"),
        );
        const target = context.world.entities.find(
            (entity) => entity.id === "target",
        );
        const targetLedger = target?.ledger?.incoming;

        expect(sourceState?.bodies?.value).toBe(5);
        expect(targetLedger?.bodies).toBe(5);
        expect(pending?.transfer).toBeDefined();
        expect(context.telemetry.log).toHaveBeenCalled();
    });

    it("spawns from the source side of the transfer path", () => {
        const handler = new TransferHandler();
        const context = makeHandlerContext(createCartridge("core.json"));

        context.world.add(
            createEntity("source", {
                state: bodiesState(10),
                physics: { x: 50, y: 50, radius: 12, mass: 1, drag: 0.1 },
            }),
        );

        context.world.add(
            createEntity("target", {
                state: bodiesState(1),
            }),
        );

        handler.handle(transferCommand(3), context);

        const pending = context.world.entities.find((entity) =>
            entity.id?.startsWith("pending_"),
        );

        const physics = pending?.physics as
            | { x?: number; y?: number }
            | undefined;

        expect(physics?.x).toBeCloseTo(65.56, 2);
        expect(physics?.y).toBeCloseTo(65.56, 2);
    });
});

