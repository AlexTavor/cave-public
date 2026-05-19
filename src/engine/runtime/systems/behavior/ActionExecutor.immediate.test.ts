import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import type { RuntimeEntity } from "../../types";
import { RuntimeCommandType } from "../../types";
import {
    buildBehaviorContext,
    createCommandBuffer,
} from "./actionExecutorTestUtils";

describe("ActionExecutor isImmediate propagation", () => {
    it("propagates isImmediate into TRANSFER_ASSETS payload", () => {
        const executor = new ActionExecutor();
        const entity: RuntimeEntity = { id: "entity_a" };
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({ self: entity });

        executor.execute(
            {
                type: "TRANSFER",
                source: "self",
                target: "entity_b",
                resource: "wood",
                amount: 2,
                isImmediate: true,
            },
            context,
            commands,
        );

        expect(buffer[0]).toEqual({
            type: RuntimeCommandType.TRANSFER_ASSETS,
            payload: {
                sourceId: "entity_a",
                targetId: "entity_b",
                payload: { wood: 2 },
                isImmediate: true,
            },
            metadata: {
                sourceEntityId: "entity_a",
                sourceLane: "behavior_rule",
            },
        });
    });

    it("omits isImmediate when not set on action", () => {
        const executor = new ActionExecutor();
        const entity: RuntimeEntity = { id: "entity_a" };
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({ self: entity });

        executor.execute(
            {
                type: "TRANSFER",
                source: "self",
                target: "entity_b",
                resource: "wood",
                amount: 2,
            },
            context,
            commands,
        );

        expect(buffer[0]).toEqual({
            type: RuntimeCommandType.TRANSFER_ASSETS,
            payload: {
                sourceId: "entity_a",
                targetId: "entity_b",
                payload: { wood: 2 },
            },
            metadata: {
                sourceEntityId: "entity_a",
                sourceLane: "behavior_rule",
            },
        });
        expect(buffer[0].payload).not.toHaveProperty("isImmediate");
    });
});

