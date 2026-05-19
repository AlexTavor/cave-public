import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import { TriggerDraftHandler } from "./TriggerDraftHandler";
import type { ModuleCartridge } from "../../data/schemas/module";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    makeTriggerDraftCartridge,
    makeTriggerDraftContext,
} from "./TriggerDraftHandler.testUtils";

const makeModule = (): ModuleCartridge =>
    makeTriggerDraftCartridge(
        [
            { optionId: "a", weight: 1 },
            { optionId: "b", weight: 1 },
            { optionId: "c", weight: 1 },
        ],
        {
            a: {
                id: "a",
                title: "A",
                description: "A",
                rarity: "common",
                icon: "wood",
                payload: [],
            },
            b: {
                id: "b",
                title: "B",
                description: "B",
                rarity: "common",
                icon: "wood",
                payload: [],
            },
            c: {
                id: "c",
                title: "C",
                description: "C",
                rarity: "common",
                icon: "wood",
                payload: [],
            },
        },
    );

const makeContext = (world: World<RuntimeEntity>, cartridge: ModuleCartridge) =>
    makeTriggerDraftContext(world, cartridge);

describe("TriggerDraftHandler", () => {
    it("selects unique options from the pool", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "sys_world" } as RuntimeEntity);
        const handler = new TriggerDraftHandler();

        vi.spyOn(Math, "random").mockReturnValue(0);

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "pool",
                    triggerEntityId: "sys_world",
                    count: 2,
                },
            },
            makeContext(world, makeModule()),
        );

        const worldEntity = world.entities[0] as RuntimeEntity & {
            draft?: any;
        };
        const optionIds = worldEntity.draft?.options.map((o: any) => o.id);
        expect(optionIds).toEqual(["a", "b"]);
        expect(new Set(optionIds).size).toBe(2);
    });

    it("logs an error when the pool is missing", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "sys_world" } as RuntimeEntity);
        const handler = new TriggerDraftHandler();
        const context = makeContext(world, makeModule());

        handler.handle(
            {
                type: RuntimeCommandType.TRIGGER_DRAFT,
                payload: {
                    poolId: "missing",
                    triggerEntityId: "sys_world",
                },
            },
            context,
        );

        expect(context.telemetry.log).toHaveBeenCalled();
    });
});

