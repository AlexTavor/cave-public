import { describe, expect, it } from "vitest";
import { UpdateCaveHandler } from "./UpdateCaveHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createDefaultCaveMind } from "../../../data/schemas/game/caveMind";

describe("UpdateCaveHandler", () => {
    it("updates cave progression skillpoints", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            cave: { progression: { xp: 0, level: 1, skillpoints: 0 } },
        });

        const handler = new UpdateCaveHandler();
        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId: "sys_world",
                    skillpoints: 5,
                },
            },
            context,
        );

        const entity = context.world.entities.find((e) => e.id === "sys_world");
        expect((entity as any).cave.progression.skillpoints).toBe(5);
    });

    it("merges attribute updates on cave components", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            cave: { attributes: { body: 1, mind: 2, social: 3 } },
        });

        const handler = new UpdateCaveHandler();
        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId: "sys_world",
                    attributes: { body: 5 },
                },
            },
            context,
        );

        const entity = context.world.entities.find((e) => e.id === "sys_world");
        expect((entity as any).cave.attributes).toEqual({
            body: 5,
            mind: 2,
            social: 3,
        });
    });

    it("logs when the cave component is missing", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world" });

        const handler = new UpdateCaveHandler();
        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId: "sys_world",
                    attributes: { body: 2 },
                },
            },
            context,
        );

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("no cave component"),
        );
    });

    it("replaces the cave mind subtree when provided", () => {
        const context = makeHandlerContext();
        const nextMind = createDefaultCaveMind();
        nextMind.pulsePresetKey = "panic";
        context.world.add({
            id: "sys_world",
            cave: {
                progression: { xp: 0, level: 1, skillpoints: 0 },
                mind: createDefaultCaveMind(),
            },
        });
        new UpdateCaveHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: { entityId: "sys_world", mind: nextMind },
            },
            context,
        );
        const entity = context.world.entities.find(
            (entry) => entry.id === "sys_world",
        ) as any;
        expect(entity.cave.mind).toEqual(nextMind);
    });

    it("stores owned habiti as a sorted unique list", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world", cave: {} });
        new UpdateCaveHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId: "sys_world",
                    ownedHabiti: ["human", "ancient", "human"],
                },
            },
            context,
        );
        const entity = context.world.entities.find(
            (entry) => entry.id === "sys_world",
        ) as any;
        expect(entity.cave.ownedHabiti).toEqual(["ancient", "human"]);
    });
});

