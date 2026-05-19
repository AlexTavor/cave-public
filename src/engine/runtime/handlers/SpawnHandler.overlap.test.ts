import { describe, expect, it } from "vitest";
import { createBlueprint, createCartridge } from "../../test/factories";
import { SpawnHandler } from "./SpawnHandler";
import { makeHandlerContext } from "./handlerTestUtils";
import { RuntimeCommandType } from "../types";

const makeBlueprint = () =>
    createBlueprint("orb", {
        components: {
            display: { display_key: "attr_body", label: "Orb" },
            physics: {
                mass: 1,
                radius: 10,
                drag: 0.1,
                isStatic: false,
                x: 100,
                y: 100,
            },
        },
    });

const addExistingBody = (context: ReturnType<typeof makeHandlerContext>) => {
    context.world.add({ id: "existing" } as any);
    context.impulseEngine.addBody({
        id: "existing",
        entity: "existing",
        x: 100,
        y: 100,
        mass: 1,
        radius: 10,
        drag: 0.1,
        position: { x: 100, y: 100 },
        prevPosition: { x: 100, y: 100 },
        acceleration: { x: 0, y: 0 },
        isStatic: false,
    });
};

describe("SpawnHandler overlap placement", () => {
    it("moves overlapping spawns to the first body edge", () => {
        const context = makeHandlerContext(
            createCartridge("core.json", {
                blueprints: { orb: makeBlueprint() },
            }),
        );
        addExistingBody(context);

        new SpawnHandler().handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "orb", id: "spawned", x: 105, y: 100 },
            },
            context,
        );

        expect(context.impulseEngine.getBody("spawned")?.x).toBe(120);
        expect((context.world.entities.at(-1) as any).physics.x).toBe(120);
    });

    it("keeps non-overlapping spawns at the requested position", () => {
        const context = makeHandlerContext(
            createCartridge("core.json", {
                blueprints: { orb: makeBlueprint() },
            }),
        );
        addExistingBody(context);

        new SpawnHandler().handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "orb", id: "spawned", x: 130, y: 100 },
            },
            context,
        );

        expect(context.impulseEngine.getBody("spawned")?.x).toBe(130);
        expect((context.world.entities.at(-1) as any).physics.x).toBe(130);
    });

    it("keeps spawns above the legacy 5000 cap valid", () => {
        const context = makeHandlerContext(
            createCartridge("core.json", {
                blueprints: { orb: makeBlueprint() },
            }),
        );

        new SpawnHandler().handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: {
                    blueprintId: "orb",
                    id: "spawned",
                    x: 5213,
                    y: 3139,
                },
            },
            context,
        );

        expect(context.impulseEngine.getBody("spawned")).toMatchObject({
            x: 5213,
            y: 3139,
        });
    });
});
