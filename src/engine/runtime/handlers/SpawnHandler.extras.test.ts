import { describe, expect, it } from "vitest";
import { SpawnHandler } from "./SpawnHandler";
import { CommandsManager } from "../CommandsManager";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { createBlueprint, createCartridge } from "../../test/factories";
import { UpdateBodiesBatchHandler } from "../../../game/handlers/UpdateBodiesBatchHandler";

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

        expect((context.world.entities[0] as any).parent).toEqual({
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
        commands.registerHandler(new UpdateBodiesBatchHandler() as any);
        commands.process(context as any);

        expect((context.world.entities[1] as any).body.habiti).toContain(
            "alpha",
        );
        expect((context.world.entities[2] as any).body).toBeUndefined();
    });
});
