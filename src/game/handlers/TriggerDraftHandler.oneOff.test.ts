import { describe, expect, it, vi } from "vitest";
import { TriggerDraftHandler } from "./TriggerDraftHandler";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { createCartridge } from "../../engine/test/factories";
import type { ModuleCartridge } from "../../data/schemas/module";
import { getWorldEntity, makeWorldWithState } from "./triggerDraftTestUtils";
import type { DraftComponent } from "../../engine/runtime/components/DraftComponent";

const makeOneOffModule = (): ModuleCartridge => ({
    ...createCartridge("test"),
    draftOptions: {
        forage: {
            id: "forage",
            title: "Foraging",
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
            texts: [],
            entries: [{ optionId: "forage", weight: 1 }],
        },
    },
});

const makeContext = (world: any, cartridge: ModuleCartridge) => ({
    world,
    cartridge,
    impulseEngine: new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
    markEntityListDirty: () => {},
    telemetry: { log: vi.fn() },
});

const seedDraft = (world: any, pickedOneOffs: string[]) => {
    const entity = getWorldEntity(world);
    (entity as { draft?: DraftComponent }).draft = {
        _tag: "draft",
        active: false,
        poolId: "",
        triggerEntityId: "",
        options: [],
        sourceLabel: "",
        selectedOptionId: null,
        pickedOneOffs,
        shownCountsByPool: {},
        cycleNumber: 0,
        currentText: "",
    };
};

describe("TriggerDraftHandler one-off", () => {
    it("excludes previously picked one-off from draft", () => {
        const world = makeWorldWithState({});
        seedDraft(world, ["forage"]);
        const handler = new TriggerDraftHandler();
        const ctx = makeContext(world, makeOneOffModule());

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "pool",
                    triggerEntityId: "sys_world",
                },
            },
            ctx,
        );

        expect(getWorldEntity(world).draft?.active).toBeFalsy();
        expect(ctx.telemetry.log).toHaveBeenCalled();
    });

    it("includes one-off option when not yet picked", () => {
        const world = makeWorldWithState({});
        const handler = new TriggerDraftHandler();

        vi.spyOn(Math, "random").mockReturnValue(0);

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "pool",
                    triggerEntityId: "sys_world",
                },
            },
            makeContext(world, makeOneOffModule()),
        );

        const entity = getWorldEntity(world);
        expect(entity.draft?.options?.map((o: any) => o.id)).toEqual([
            "forage",
        ]);
    });

    it("does not fire draft when all options are used one-offs", () => {
        const world = makeWorldWithState({});
        seedDraft(world, ["forage"]);
        const handler = new TriggerDraftHandler();
        const ctx = makeContext(world, makeOneOffModule());

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "pool",
                    triggerEntityId: "sys_world",
                },
            },
            ctx,
        );

        const entity = getWorldEntity(world);
        expect(entity.draft?.active).toBeFalsy();
    });
});

