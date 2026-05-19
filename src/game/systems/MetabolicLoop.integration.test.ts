import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { BehaviorSystem } from "../../engine/runtime/systems/BehaviorSystem";
import { UpdateTraitsBatchHandler } from "../handlers/UpdateTraitsBatchHandler";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { createCommandBuffer, createMetabolicEntities } from "./testUtils";

const makeSnapshot = (entities: RuntimeEntity[]): Snapshot =>
    new Snapshot(entities, { getBody: () => undefined } as any);

describe("Metabolic loop", () => {
    it("adds malnourished traits and lowers output", () => {
        const context = makeHandlerContext();
        const world = context.world;

        const { sysWorld, worker } = createMetabolicEntities();

        world.add(sysWorld);
        world.add(worker);

        const behaviorSystem = new BehaviorSystem();
        const behaviorBuffer = createCommandBuffer();
        behaviorSystem.tick(
            makeSnapshot([...world.entities]),
            behaviorBuffer.commands,
            1,
        );

        const setGlobal = behaviorBuffer.buffer.find(
            (cmd) => cmd.type === RuntimeCommandType.SET_GLOBAL,
        );
        const addTrait = behaviorBuffer.buffer.find(
            (cmd) => cmd.type === RuntimeCommandType.UPDATE_TRAITS_BATCH,
        );

        expect(setGlobal).toBeDefined();
        expect(addTrait).toBeDefined();

        const traitHandler = new UpdateTraitsBatchHandler();
        traitHandler.handle(addTrait as any, context);

        const updated = world.entities.find((e) => e.id === "worker");
        const traits = (updated as any).traits;
        expect(traits).toEqual([{ id: "malnourished" }]);
    });
});
