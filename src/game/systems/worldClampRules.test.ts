import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import {
    RuntimeCommandType,
    type RuntimeEntity,
} from "../../engine/runtime/types";
import { BehaviorSystem } from "../../engine/runtime/systems/BehaviorSystem";
import type { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { createCommandBuffer } from "./testUtils";
import { WORLD_CLAMP_RULES } from "../../data/schemas/v2/worldClampRules";

const makeSnapshot = (world: ReturnType<typeof makeWorld>) =>
    new Snapshot(
        [world as unknown as RuntimeEntity],
        { getBody: () => undefined } as unknown as ImpulseEngine,
        {},
    );

const makeWorld = (tutorialMode: number, food: number, heat: number) => ({
    id: "sys_world",
    state: {
        tutorial_mode: { value: tutorialMode, visible: false },
        food: { value: food, max: 100, visible: true },
        heat: { value: heat, max: 200, visible: true },
    },
    behavior: { rules: WORLD_CLAMP_RULES },
});

describe("WORLD_CLAMP_RULES", () => {
    it("raises food and heat to half max while tutorial mode is enabled", () => {
        const { buffer, commands } = createCommandBuffer();
        new BehaviorSystem().tick(
            makeSnapshot(makeWorld(1, 10, 20)),
            commands,
            1,
        );

        expect(buffer).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: "sys_world", key: "food", value: 50 },
            metadata: {
                sourceEntityId: "sys_world",
                sourceLane: "behavior_rule",
            },
        });
        expect(buffer).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: "sys_world", key: "heat", value: 100 },
            metadata: {
                sourceEntityId: "sys_world",
                sourceLane: "behavior_rule",
            },
        });
    });

    it("leaves values alone when tutorial mode is disabled", () => {
        const { buffer, commands } = createCommandBuffer();
        new BehaviorSystem().tick(
            makeSnapshot(makeWorld(0, 10, 20)),
            commands,
            1,
        );
        expect(buffer).toEqual([]);
    });
});
