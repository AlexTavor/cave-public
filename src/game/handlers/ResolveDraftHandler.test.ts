import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { RuntimeEntity } from "../../engine/runtime/types";
import {
    makeTriggerDraftCartridge,
    makeTriggerDraftContext,
} from "./TriggerDraftHandler.testUtils";
import { ResolveDraftHandler } from "./ResolveDraftHandler";

const makeWorld = (targetOptionId: string | null = null) => {
    const world = new World<RuntimeEntity>();
    world.add({
        id: "sys_world",
        tutorial: {
            active: targetOptionId != null,
            bindings: targetOptionId
                ? [
                      {
                          targetOptionId,
                          guidanceId: "draft",
                          targetId: null,
                          textOverride: null,
                      },
                  ]
                : [],
        },
        draft: {
            _tag: "draft",
            active: true,
            poolId: "pool",
            triggerEntityId: "sys_world",
            options: [
                {
                    id: "a",
                    title: "A",
                    description: "A",
                    rarity: "common",
                    icon: "wood",
                    payload: [],
                },
                {
                    id: "b",
                    title: "B",
                    description: "B",
                    rarity: "common",
                    icon: "wood",
                    payload: [],
                    oneOff: true,
                },
            ],
            sourceLabel: "Draft",
            selectedOptionId: null,
            pickedOneOffs: [],
            shownCountsByPool: {},
            cycleNumber: 0,
            currentText: "",
        },
    } as RuntimeEntity);
    return world;
};

describe("ResolveDraftHandler", () => {
    it("accepts the guided target option", () => {
        const world = makeWorld("a");
        new ResolveDraftHandler().handle(
            {
                type: RuntimeCommandType.RESOLVE_DRAFT,
                payload: { selectedOptionId: "a" },
            },
            makeTriggerDraftContext(world, makeTriggerDraftCartridge([], {})),
        );
        expect((world.entities[0] as any).draft.selectedOptionId).toBe("a");
    });

    it("rejects non-target selections while guided", () => {
        const world = makeWorld("a");
        const context = makeTriggerDraftContext(
            world,
            makeTriggerDraftCartridge([], {}),
        );
        new ResolveDraftHandler().handle(
            {
                type: RuntimeCommandType.RESOLVE_DRAFT,
                payload: { selectedOptionId: "b" },
            },
            context,
        );
        expect((world.entities[0] as any).draft.selectedOptionId).toBeNull();
        expect((world.entities[0] as any).draft.active).toBe(true);
        expect(context.telemetry.log).toHaveBeenCalled();
    });

    it("preserves unguided selection behavior", () => {
        const world = makeWorld();
        new ResolveDraftHandler().handle(
            {
                type: RuntimeCommandType.RESOLVE_DRAFT,
                payload: { selectedOptionId: "b" },
            },
            makeTriggerDraftContext(world, makeTriggerDraftCartridge([], {})),
        );
        expect((world.entities[0] as any).draft.selectedOptionId).toBe("b");
        expect((world.entities[0] as any).draft.pickedOneOffs).toEqual(["b"]);
    });

    it("logs and falls back when the guided target is missing", () => {
        const world = makeWorld("missing");
        const context = makeTriggerDraftContext(
            world,
            makeTriggerDraftCartridge([], {}),
        );
        new ResolveDraftHandler().handle(
            {
                type: RuntimeCommandType.RESOLVE_DRAFT,
                payload: { selectedOptionId: "b" },
            },
            context,
        );
        expect((world.entities[0] as any).draft.selectedOptionId).toBe("b");
        expect(context.telemetry.log).toHaveBeenCalled();
    });
});
