import { describe, expect, it } from "vitest";
import { createBlueprint, createCartridge } from "../../test/factories";
import { CommandsManager } from "../CommandsManager";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";
import { SpawnHandler } from "./SpawnHandler";
import { UpdateBodiesBatchHandler } from "../../../game/handlers/UpdateBodiesBatchHandler";

const makeCartridge = () =>
    createCartridge("core.json", {
        blueprints: {
            worker: createBlueprint("worker", {
                tags: ["body"],
                components: { body: { passport: { name: "" } } as any },
            }),
        },
        config: {
            habiti: {
                chosen: {
                    id: "chosen",
                    label: "Chosen",
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
                            weightedPool: [{ habitusId: "chosen", weight: 1 }],
                        },
                    ],
                },
            },
        },
    });

describe("SpawnHandler body identity", () => {
    it("queues UPDATE_BODIES_BATCH and applies spawned Habiti through the handler", () => {
        const context = makeHandlerContext(makeCartridge());
        // Stub the game-domain assigner: these tests cover the engine spawn
        // flow (pending habiti → UPDATE_BODIES_BATCH → applied), not the rules.
        context.assignBodyHabiti = () => ["chosen"];
        context.world.add({
            id: "sys_world",
            state: { bodySerial: { value: 0, visible: false } },
        } as any);
        new SpawnHandler().handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "worker", id: "body-1" },
            },
            context,
        );

        const entity = context.world.entities.find(
            (item: any) => item.id === "body-1",
        ) as any;
        expect(entity?.body.habiti).toBeUndefined();

        const commands = context.commands as CommandsManager;
        commands.registerHandler(new UpdateBodiesBatchHandler() as any);
        commands.process(context as any);

        expect(entity?.body.habiti).toEqual(["chosen"]);
    });

    it("logs loudly and leaves Habiti unchanged when follow-up commands are unavailable", () => {
        const context = makeHandlerContext(makeCartridge());
        // Stub the game-domain assigner: these tests cover the engine spawn
        // flow (pending habiti → UPDATE_BODIES_BATCH → applied), not the rules.
        context.assignBodyHabiti = () => ["chosen"];
        context.commands = undefined;
        context.world.add({ id: "sys_world", state: {} } as any);
        new SpawnHandler().handle(
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "worker", id: "body-2" },
            },
            context,
        );

        const entity = context.world.entities.find(
            (item: any) => item.id === "body-2",
        ) as any;
        expect(entity?.body.habiti).toBeUndefined();
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            "Spawn queued Habiti update failed: commands missing for 'body-2'.",
        );
    });
});
