import { describe, it, expect } from "vitest";
import { SpawnHandler } from "./SpawnHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createCartridge } from "../../test/factories";

const bodyBlueprint = {
    id: "npc",
    label: "npc",
    tags: ["body"] as string[],
    components: {
        body: { health: 100, maxHealth: 100 },
    },
};

const physicalBodyBlueprint = {
    id: "physical_body",
    label: "physical_body",
    tags: ["body"] as string[],
    components: {
        body: { health: 100, maxHealth: 100 },
        physics: {
            mass: 1,
            radius: 28,
            drag: 0.1,
            isStatic: false,
            x: 300,
            y: 300,
        },
    },
};

const nodeBlueprint = {
    id: "relay_node",
    label: "relay_node",
    tags: [] as string[],
    components: {
        physics: {
            mass: 50,
            radius: 40,
            drag: 0.1,
            isStatic: false,
            x: 300,
            y: 300,
        },
    },
};

describe("SpawnHandler body physics cleanup", () => {
    it("does not register body entities with the impulse engine", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: { npc: bodyBlueprint } as any,
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "npc", id: "body-1" },
            },
            context,
        );

        expect(context.impulseEngine.getBody("body-1")).toBeUndefined();
        expect((context.world.entities[0] as any).physics).toBeUndefined();
    });

    it("keeps physics bodies for non-body entities", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: { relay_node: nodeBlueprint } as any,
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "relay_node", id: "relay-1" },
            },
            context,
        );

        expect(context.impulseEngine.getBody("relay-1")).toBeDefined();
    });

    it("honors payload position for body blueprints with physics and starts at rest", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: { physical_body: physicalBodyBlueprint } as any,
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: {
                    blueprintId: "physical_body",
                    id: "body-2",
                    x: 140,
                    y: 220,
                },
            },
            context,
        );

        expect(context.impulseEngine.getBody("body-2")).toMatchObject({
            position: { x: 140, y: 220 },
            prevPosition: { x: 140, y: 220 },
        });
    });
});

