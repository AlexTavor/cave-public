import { describe, expect, it } from "vitest";
import { createBlueprint, createCartridge } from "../../engine/test/factories";
import { CommandsManager } from "../../engine/runtime/CommandsManager";
import {
    RuntimeCommandType,
    type RuntimeEntity,
} from "../../engine/runtime/types";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { SpawnHandler } from "../../engine/runtime/handlers/SpawnHandler";
import { UpdateBodiesBatchHandler } from "./UpdateBodiesBatchHandler";

type BodyView = { body?: { habiti?: string[] } };

describe("SpawnHandler forced habiti", () => {
    it("applies forced habiti even without a matching body type rule", () => {
        const context = makeHandlerContext(
            createCartridge("core.json", {
                blueprints: {
                    villager: createBlueprint("villager", {
                        tags: ["body"],
                        components: { body: { passport: { name: "" } } },
                    }),
                },
                config: {
                    habiti: {
                        Hommleter: {
                            id: "Hommleter",
                            label: "Hommleter",
                            type: "social_category",
                            effects: [],
                            excludes: [],
                        },
                    },
                    settings: { body: { habitusTypeRules: [] } },
                },
            }),
        );
        // Stub the game-domain assigner to echo forced habiti: this asserts the
        // engine forwards payload.forcedHabiti into the assigner input and
        // applies the result — the rule itself lives in assignBodyHabiti tests.
        context.assignBodyHabiti = (input) => [...(input.forcedHabiti ?? [])];
        context.world.add({
            id: "sys_world",
            state: {},
        } as unknown as RuntimeEntity);

        new SpawnHandler().handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: {
                    blueprintId: "villager",
                    id: "villager-1",
                    forcedHabiti: ["Hommleter"],
                },
            },
            context,
        );

        const commands = context.commands as CommandsManager;
        commands.registerHandler(new UpdateBodiesBatchHandler());
        commands.process(context);

        expect((context.world.entities[1] as BodyView).body?.habiti).toEqual([
            "Hommleter",
        ]);
    });
});
