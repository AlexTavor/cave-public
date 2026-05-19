import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import { TriggerDraftHandler } from "./TriggerDraftHandler";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    makeTriggerDraftCartridge,
    makeTriggerDraftContext,
} from "./TriggerDraftHandler.testUtils";

const makeCartridge = (weight = 1) =>
    makeTriggerDraftCartridge([{ optionId: "a", weight }], {
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

const makeContext = (world: World<RuntimeEntity>, weight = 1) =>
    makeTriggerDraftContext(world, makeCartridge(weight));

describe("TriggerDraftHandler completion errors", () => {
    it("logs when onComplete is absent on exhaustion", () => {
        const world = new World<RuntimeEntity>();
        world.add({
            id: "sys_world",
            draft: { pickedOneOffs: ["a"] },
        } as RuntimeEntity);
        const context = makeContext(world);

        new TriggerDraftHandler().handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            context,
        );

        expect(context.telemetry.log).toHaveBeenCalled();
        expect(context.commands?.size()).toBe(0);
    });

    it("logs when the completion trigger entity is missing", () => {
        const world = new World<RuntimeEntity>();
        world.add({
            id: "sys_world",
            draft: { pickedOneOffs: ["a"] },
        } as RuntimeEntity);
        const context = makeContext(world);

        new TriggerDraftHandler().handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "pool",
                    triggerEntityId: "ghost",
                    onComplete: [{ type: "KILL", entityId: "self" }],
                },
            },
            context,
        );

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            "TRIGGER_DRAFT failed: trigger entity missing.",
        );
        expect(context.commands?.size()).toBe(0);
    });

    it("does not execute completion actions when selection fails", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "sys_world" } as RuntimeEntity);
        world.add({ id: "cave" } as RuntimeEntity);
        const context = makeContext(world, 0);

        new TriggerDraftHandler().handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "pool",
                    triggerEntityId: "cave",
                    onComplete: [{ type: "KILL", entityId: "self" }],
                },
            },
            context,
        );

        expect(context.commands?.size()).toBe(0);
        expect(context.telemetry.log).toHaveBeenCalled();
    });
});
