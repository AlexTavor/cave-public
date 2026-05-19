import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import type { RuntimeEntity } from "../../types";
import { RuntimeCommandType } from "../../types";
import {
    buildBehaviorContext,
    createCommandBuffer,
} from "./actionExecutorTestUtils";

describe("ActionExecutor mutate actions", () => {
    it("emits ADJUST_STATE for mutate actions", () => {
        const executor = new ActionExecutor();
        const entity: RuntimeEntity = {
            id: "entity_a",
            state: { energy: { value: 2 } },
        };
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({ self: entity });

        executor.execute(
            {
                type: "MUTATE",
                target: "self.state.energy",
                op: "ADD",
                value: 3,
            },
            context,
            commands,
        );

        expect(buffer[0]).toEqual({
            type: RuntimeCommandType.ADJUST_STATE,
            payload: { entityId: "entity_a", key: "energy", delta: 3 },
            metadata: {
                sourceEntityId: "entity_a",
                sourceLane: "behavior_rule",
            },
        });
    });

    it("emits SET_GLOBAL for global mutate actions", () => {
        const executor = new ActionExecutor();
        const entity: RuntimeEntity = { id: "entity_a" };
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({
            self: entity,
            globals: { rate: 2 },
        });

        executor.execute(
            {
                type: "MUTATE",
                target: "global.rate",
                op: "SET",
                value: 4,
            },
            context,
            commands,
        );

        expect(buffer[0]).toEqual({
            type: RuntimeCommandType.SET_GLOBAL,
            payload: { key: "rate", value: 4 },
            metadata: {
                sourceEntityId: "entity_a",
                sourceLane: "behavior_rule",
            },
        });
    });

    it("routes cave attribute mutations to UPDATE_CAVE", () => {
        const executor = new ActionExecutor();
        const sysWorld: RuntimeEntity = {
            id: "sys_world",
            cave: { attributes: { body: 2, mind: 1, social: 1 } },
        };
        const entity: RuntimeEntity = { id: "entity_a" };
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({
            self: entity,
            entities: [sysWorld],
        });

        executor.execute(
            {
                type: "MUTATE",
                target: "sys_world.cave.attributes.body",
                op: "ADD",
                value: 1,
            },
            context,
            commands,
        );

        expect(buffer).toEqual([
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId: "sys_world",
                    attributes: { body: 3 },
                },
                metadata: {
                    sourceEntityId: "entity_a",
                    sourceLane: "behavior_rule",
                },
            },
        ]);
    });
});

