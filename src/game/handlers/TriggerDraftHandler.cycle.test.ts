import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { TriggerDraftHandler } from "./TriggerDraftHandler";
import {
    makeTriggerDraftCartridge,
    makeTriggerDraftContext,
} from "./TriggerDraftHandler.testUtils";

describe("TriggerDraftHandler cycle coupling", () => {
    it("does not enqueue cycle completion facts", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "sys_world" } as RuntimeEntity);
        world.add({ id: "explore-1", blueprintId: "explore" } as RuntimeEntity);
        const context = makeTriggerDraftContext(
            world,
            makeTriggerDraftCartridge([{ optionId: "a", weight: 1 }], {
                a: {
                    id: "a",
                    title: "A",
                    description: "A",
                    rarity: "common",
                    icon: "wood",
                    payload: [],
                },
            }),
        );

        new TriggerDraftHandler().handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "pool",
                    triggerEntityId: "explore-1",
                    count: 1,
                },
            },
            context,
        );

        const commands = context.commands.drain();

        expect(
            commands.some(
                (command) =>
                    command.type === RuntimeCommandType.ADJUST_FACT &&
                    command.payload.factType === "cycle_completed",
            ),
        ).toBe(false);
    });
});
