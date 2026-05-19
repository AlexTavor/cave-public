import { describe, expect, it } from "vitest";
import { createBlueprint, createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { SpawnHandler } from "./SpawnHandler";

describe("SpawnHandler unified blueprint authored parenting", () => {
    it("parents the source to a queued peer when the peer satisfies its selector", () => {
        const cartridge = createCartridge("core.json", {
            blueprints: {
                absorption: createBlueprint("absorption", {
                    components: {
                        parent: { kind: "entity_tag", tag: "inside" },
                        physics: {
                            x: 300,
                            y: 400,
                            radius: 7,
                            mass: 1,
                            drag: 0,
                            isStatic: true,
                        },
                    },
                    _editor: {
                        abilities: {
                            unifiedBlueprints: [
                                { tag: "inside", spawnWhenPeerSpawns: false },
                            ],
                        },
                    },
                }),
                inside: createBlueprint("inside", {
                    tags: ["inside"],
                    components: {
                        physics: {
                            x: 10,
                            y: 20,
                            radius: 5,
                            mass: 1,
                            drag: 0,
                            isStatic: true,
                        },
                    },
                    _editor: {
                        abilities: {
                            unifiedBlueprints: [
                                { tag: "inside", spawnWhenPeerSpawns: true },
                            ],
                        },
                    },
                }),
            },
        });
        const context = makeHandlerContext(cartridge);
        const commands = context.commands as CommandsManager;
        commands.registerHandler(new SpawnHandler() as never);
        commands.registerHandler({
            type: RuntimeCommandType.ADJUST_FACT,
            handle: () => undefined,
        } as never);

        commands.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: { blueprintId: "absorption", id: "absorb-1" },
        });
        commands.process(context);

        const inside = context.world.entities.find(
            (entity) => entity.blueprintId === "inside",
        ) as { id?: string; physics?: { x?: number; y?: number } };
        const absorption = context.world.entities.find(
            (entity) => entity.blueprintId === "absorption",
        ) as {
            parent?: { parentId?: string };
            physics?: { x?: number; y?: number };
        };

        expect(absorption.parent?.parentId).toBe(inside.id);
        expect(absorption.physics?.x).toBe(300);
        expect(absorption.physics?.y).toBe(400);
        expect(inside.physics?.x).toBe(10);
        expect(inside.physics?.y).toBe(20);
    });
});
