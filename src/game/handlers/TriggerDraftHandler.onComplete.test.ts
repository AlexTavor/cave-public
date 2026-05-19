import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import { TriggerDraftHandler } from "./TriggerDraftHandler";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    makeTriggerDraftCartridge,
    makeTriggerDraftContext,
} from "./TriggerDraftHandler.testUtils";

const makeCartridge = () =>
    makeTriggerDraftCartridge([{ optionId: "a", weight: 1 }], {
        a: {
            id: "a",
            title: "A",
            description: "A",
            rarity: "common",
            icon: "wood",
            oneOff: true,
            payload: [],
        },
    });

const makeContext = (world: World<RuntimeEntity>) =>
    makeTriggerDraftContext(world, makeCartridge());

const makeWorld = () => {
    const world = new World<RuntimeEntity>();
    world.add({
        id: "sys_world",
        draft: { pickedOneOffs: ["a"] },
    } as RuntimeEntity);
    world.add({ id: "cave" } as RuntimeEntity);
    return world;
};

describe("TriggerDraftHandler onComplete", () => {
    it("enqueues completion commands in author order", () => {
        const context = makeContext(makeWorld());
        new TriggerDraftHandler().handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "pool",
                    triggerEntityId: "cave",
                    onComplete: [
                        { type: "KILL", entityId: "self" },
                        { type: "SHOW_CINEMATIC", lines: ["Done"] },
                    ],
                },
            },
            context,
        );

        expect(context.commands?.drain()).toEqual([
            expect.objectContaining({
                type: RuntimeCommandType.KILL,
                payload: { entityId: "cave" },
                metadata: {
                    sourceEntityId: "cave",
                    sourceLane: "draft_on_complete",
                },
            }),
            expect.objectContaining({
                type: RuntimeCommandType.SHOW_CINEMATIC,
                payload: { lines: ["Done"] },
                metadata: {
                    sourceEntityId: "cave",
                    sourceLane: "draft_on_complete",
                },
            }),
        ]);
    });
});
