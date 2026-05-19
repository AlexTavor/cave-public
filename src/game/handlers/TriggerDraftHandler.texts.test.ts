import { describe, expect, it, vi } from "vitest";
import { TriggerDraftHandler } from "./TriggerDraftHandler";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { createCartridge } from "../../engine/test/factories";
import { getWorldEntity, makeWorldWithState } from "./triggerDraftTestUtils";
import type { DraftComponent } from "../../engine/runtime/components/DraftComponent";

const makeContext = (world: any, cartridge: any) => ({
    world,
    cartridge,
    impulseEngine: new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
    markEntityListDirty: () => {},
    telemetry: { log: vi.fn() },
});

const makeModule = () => ({
    ...createCartridge("test"),
    draftOptions: {
        first: {
            id: "first",
            title: "First",
            description: "",
            rarity: "common",
            icon: "wood",
            payload: [],
        },
        second: {
            id: "second",
            title: "Second",
            description: "",
            rarity: "common",
            icon: "wood",
            payload: [],
        },
        oneoff: {
            id: "oneoff",
            title: "One Off",
            description: "",
            rarity: "common",
            icon: "wood",
            oneOff: true,
            payload: [],
        },
    },
    draftPools: {
        pool: {
            id: "pool",
            texts: ["Text one", "Text two"],
            entries: [{ optionId: "first", weight: 1 }],
        },
        other: {
            id: "other",
            texts: ["Other text"],
            entries: [{ optionId: "second", weight: 1 }],
        },
        blocked: {
            id: "blocked",
            texts: ["Blocked"],
            entries: [{ optionId: "oneoff", weight: 1 }],
        },
    },
});

const seedDraft = (world: any, draft: Partial<DraftComponent>) => {
    getWorldEntity(world).draft = {
        _tag: "draft",
        active: false,
        poolId: "",
        triggerEntityId: "",
        options: [],
        sourceLabel: "",
        selectedOptionId: null,
        pickedOneOffs: [],
        shownCountsByPool: {},
        cycleNumber: 0,
        currentText: "",
        ...draft,
    };
};

describe("TriggerDraftHandler texts", () => {
    it("increments cycle number per successful pool trigger", () => {
        const world = makeWorldWithState({});
        const handler = new TriggerDraftHandler();

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(world, makeModule()),
        );
        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(world, makeModule()),
        );

        expect(getWorldEntity(world).draft?.cycleNumber).toBe(2);
        expect(getWorldEntity(world).draft?.currentText).toBe("Text two");
    });

    it("tracks shown counts independently per pool and falls back to empty text", () => {
        const world = makeWorldWithState({});
        const handler = new TriggerDraftHandler();

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(world, makeModule()),
        );
        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "other", triggerEntityId: "sys_world" },
            },
            makeContext(world, makeModule()),
        );
        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(world, makeModule()),
        );
        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(world, makeModule()),
        );

        expect(getWorldEntity(world).draft?.shownCountsByPool).toEqual({
            other: 1,
            pool: 3,
        });
        expect(getWorldEntity(world).draft?.currentText).toBe("");
    });

    it("does not increment shown counts when the trigger fails", () => {
        const world = makeWorldWithState({});
        seedDraft(world, {
            pickedOneOffs: ["oneoff"],
            shownCountsByPool: { blocked: 2 },
        });
        const handler = new TriggerDraftHandler();
        const context = makeContext(world, makeModule());

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "blocked", triggerEntityId: "sys_world" },
            },
            context,
        );

        expect(getWorldEntity(world).draft?.shownCountsByPool).toEqual({
            blocked: 2,
        });
        expect(context.telemetry.log).toHaveBeenCalled();
    });
});
