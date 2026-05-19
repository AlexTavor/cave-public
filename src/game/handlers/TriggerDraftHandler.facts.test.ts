import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { TriggerDraftHandler } from "./TriggerDraftHandler";
import {
    makeTriggerDraftCartridge,
    makeTriggerDraftContext,
} from "./TriggerDraftHandler.testUtils";

describe("TriggerDraftHandler draft facts", () => {
    it("emits draft_opened after a draft is attached", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "sys_world" } as RuntimeEntity);
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
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            context,
        );

        expect((world.entities[0] as any).draft?.active).toBe(true);
        expect(context.commands.drain()).toContainEqual({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "run",
                factType: "draft_opened",
                factAbout: "pool",
                delta: 1,
            },
        });
    });
});
