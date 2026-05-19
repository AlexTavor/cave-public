import { describe, expect, it, vi } from "vitest";
import { TriggerDraftHandler } from "./TriggerDraftHandler";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { createCartridge } from "../../engine/test/factories";
import type { ModuleCartridge } from "../../data/schemas/module";
import { getWorldEntity, makeWorldWithState } from "./triggerDraftTestUtils";

const makeRule = (compiled: unknown) => ({
    id: "rule",
    sortKey: "sk_rule",
    tokens: [],
    compiled,
});

const makeModule = (compiled: unknown): ModuleCartridge => {
    const base = createCartridge("test");
    return {
        ...base,
        draftOptions: {
            opt: {
                id: "opt",
                title: "Option",
                description: "",
                rarity: "common",
                icon: "wood",
                payload: [],
                conditions: [makeRule(compiled)],
            },
        },
        draftPools: {
            pool: {
                id: "pool",
                texts: [],
                entries: [{ optionId: "opt", weight: 1 }],
            },
        },
    };
};

const makeContext = (world: any, cartridge: ModuleCartridge) => ({
    world,
    cartridge,
    impulseEngine: new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
    markEntityListDirty: () => {},
    telemetry: { log: vi.fn() },
});

describe("TriggerDraftHandler conditions", () => {
    it("excludes options when conditions are false", () => {
        const world = makeWorldWithState({ flag: { value: 0 } });
        const handler = new TriggerDraftHandler();

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(
                world,
                makeModule({ "==": [{ var: "globals.flag" }, 1] }),
            ),
        );

        expect(getWorldEntity(world).draft).toBeUndefined();
    });

    it("includes options when conditions are true", () => {
        const world = makeWorldWithState({ flag: { value: 0 } });
        const handler = new TriggerDraftHandler();

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(
                world,
                makeModule({ "==": [{ var: "globals.flag" }, 0] }),
            ),
        );

        const draft = getWorldEntity(world).draft;
        expect(draft?.options?.map((opt: any) => opt.id)).toEqual(["opt"]);
    });

    it("excludes options after one-time purchase", () => {
        const world = makeWorldWithState({ tech_pot: { value: 0 } });
        const handler = new TriggerDraftHandler();

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(
                world,
                makeModule({ "==": [{ var: "globals.tech_pot" }, 0] }),
            ),
        );

        const worldEntity = getWorldEntity(world);
        expect(worldEntity.draft?.options?.length).toBe(1);
        worldEntity.draft = undefined;
        worldEntity.state!.tech_pot.value = 1;

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: { poolId: "pool", triggerEntityId: "sys_world" },
            },
            makeContext(
                world,
                makeModule({ "==": [{ var: "globals.tech_pot" }, 0] }),
            ),
        );

        expect(getWorldEntity(world).draft).toBeUndefined();
    });
});

