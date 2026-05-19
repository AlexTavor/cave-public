import { describe, it, expect } from "vitest";
import { KillHandler } from "./KillHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge, createEntity } from "../../test/factories";

describe("KillHandler", () => {
    it("removes an existing entity", () => {
        const handler = new KillHandler();
        const cartridge = createCartridge("core.json");
        const context = makeHandlerContext(cartridge);
        context.world.add(createEntity("entity-1", { blueprintId: "worker" }));

        handler.handle(
            {
                type: RuntimeCommandType.KILL,
                payload: { entityId: "entity-1" },
            },
            context,
        );

        expect(context.world.entities.length).toBe(0);
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "tick",
            expect.stringContaining("entity-1"),
        );
        expect(context.commands?.drain()).toContainEqual({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "run",
                factType: "blueprint_killed",
                factAbout: "worker",
                delta: 1,
            },
        });
    });

    it("logs a warning when entity is missing", () => {
        const handler = new KillHandler();
        const cartridge = createCartridge("core.json");
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.KILL,
                payload: { entityId: "ghost" },
            },
            context,
        );

        expect(context.world.entities.length).toBe(0);
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("ghost"),
        );
    });

    it("enriches the applied command with dead-body presentation before removal", () => {
        const handler = new KillHandler();
        const context = makeHandlerContext(createCartridge("core.json"));
        context.world.add(createEntity("entity-1", { tags: ["anim:kill"] }));
        context.impulseEngine.addBody({
            id: "entity-1",
            entity: "entity-1",
            x: 11,
            y: 22,
            mass: 1,
            radius: 7,
            drag: 0.1,
            position: { x: 11, y: 22 },
            prevPosition: { x: 11, y: 22 },
            acceleration: { x: 0, y: 0 },
            isStatic: false,
        });
        const command = {
            type: RuntimeCommandType.KILL,
            payload: { entityId: "entity-1" },
        } as const;

        handler.handle(command as any, context);
        const carrier = command as {
            metadata?: { deadBodyPresentation?: unknown };
        };

        expect(carrier.metadata?.deadBodyPresentation).toEqual({
            x: 11,
            y: 22,
            radius: 7,
        });
    });
});

