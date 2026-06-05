import { describe, expect, it } from "vitest";
import { SpawnHandler } from "../../engine/runtime/handlers/SpawnHandler";
import { CommandsManager } from "../../engine/runtime/CommandsManager";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { createBlueprint, createCartridge } from "../../engine/test/factories";
import { UpdateBodiesBatchHandler } from "./UpdateBodiesBatchHandler";

type BodyView = { body?: { habiti?: string[] } };
type ParentView = { parent?: { parentId?: string } };

describe("SpawnHandler extras", () => {
    it("overrides blueprint parent with payload parent id", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                npc: createBlueprint("npc", {
                    components: {
                        parent: { parentId: "blueprint_parent" },
                    } as never,
                }),
            },
        });
        const context = makeHandlerContext(cartridge);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "npc", parentId: "payload_parent" },
            },
            context,
        );

        expect((context.world.entities[0] as ParentView).parent).toEqual({
            parentId: "payload_parent",
        });
    });

    it("forwards forced habitus ids for body spawns and ignores them for non-body spawns", () => {
        const handler = new SpawnHandler();
        const cartridge = createCartridge("core.json", {
            blueprints: {
                body_npc: createBlueprint("body_npc", {
                    tags: ["body"],
                    components: {
                        body: { passport: { name: "Ada" } },
                    } as never,
                }),
                plain_npc: createBlueprint("plain_npc", { components: {} }),
            },
            config: {
                habiti: {
                    alpha: {
                        id: "alpha",
                        label: "Alpha",
                        type: "unique_body",
                        effects: [],
                        excludes: [],
                    },
                },
                settings: {
                    body: {
                        habitusTypeRules: [
                            {
                                habitusType: "unique_body",
                                probability: 1,
                                maxCount: 1,
                                weightedPool: [
                                    { habitusId: "alpha", weight: 1 },
                                ],
                            },
                        ],
                    },
                },
            },
        } as never);
        const context = makeHandlerContext(cartridge);
        // Stub the game-domain assigner to echo forced habiti: asserts the
        // engine forwards payload.forcedHabiti for body spawns (and never calls
        // it for bodyless spawns), not the habitus rules themselves.
        context.assignBodyHabiti = (input) => [...(input.forcedHabiti ?? [])];
        context.world.add({ id: "sys_world", state: {} } as never);

        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "body_npc", forcedHabiti: ["alpha"] },
            },
            context,
        );
        handler.handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "plain_npc", forcedHabiti: ["alpha"] },
            },
            context,
        );

        const commands = context.commands as CommandsManager;
        commands.registerHandler(new UpdateBodiesBatchHandler());
        commands.process(context);

        expect((context.world.entities[1] as BodyView).body?.habiti).toContain(
            "alpha",
        );
        expect((context.world.entities[2] as BodyView).body).toBeUndefined();
    });
});
