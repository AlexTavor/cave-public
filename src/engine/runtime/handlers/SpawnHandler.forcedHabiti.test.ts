import { describe, expect, it } from "vitest";
import { createBlueprint, createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { SpawnHandler } from "./SpawnHandler";
import { UpdateBodiesBatchHandler } from "../../../game/handlers/UpdateBodiesBatchHandler";

describe("SpawnHandler forced habiti", () => {
    it("applies forced habiti even without a matching body type rule", () => {
        const context = makeHandlerContext(
            createCartridge("core.json", {
                blueprints: {
                    villager: createBlueprint("villager", {
                        tags: ["body"],
                        components: { body: { passport: { name: "" } } as any },
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
        context.world.add({ id: "sys_world", state: {} } as any);

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
        commands.registerHandler(new UpdateBodiesBatchHandler() as any);
        commands.process(context as any);

        expect((context.world.entities[1] as any).body.habiti).toEqual([
            "Hommleter",
        ]);
    });
});
