import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import type { RuntimeEntity } from "../../types";
import { RuntimeCommandType } from "../../types";
import {
    buildBehaviorContext,
    createCommandBuffer,
} from "./actionExecutorTestUtils";

describe("ActionExecutor action commands", () => {
    it("emits TRANSFER_ASSETS for transfer actions", () => {
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
    });

    it("emits SPAWN and KILL commands", () => {
        const executor = new ActionExecutor();
        const entity: RuntimeEntity = { id: "entity_a" };
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({ self: entity });

        executor.execute(
            { type: "SPAWN", blueprintId: "ghost" },
            context,
            commands,
        );
        executor.execute({ type: "KILL", entityId: "self" }, context, commands);

        expect(buffer).toEqual([
            {
                type: RuntimeCommandType.SPAWN,
                payload: { blueprintId: "ghost" },
                metadata: {
                    sourceEntityId: "entity_a",
                    sourceLane: "behavior_rule",
                },
            },
            {
                type: RuntimeCommandType.KILL,
                payload: { entityId: "entity_a" },
                metadata: {
                    sourceEntityId: "entity_a",
                    sourceLane: "behavior_rule",
                },
            },
        ]);
    });

    it("resolves tag sources for transfer actions", () => {
        const executor = new ActionExecutor();
        const receiver: RuntimeEntity = { id: "receiver" };
        const sourceA: RuntimeEntity = {
            id: "source_a",
            tags: ["storage:wood"],
            state: { wood: { value: 5 } },
        };
        const sourceB: RuntimeEntity = {
            id: "source_b",
            tags: ["storage:wood"],
            state: { wood: { value: 10 } },
        };
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({
            self: receiver,
            entities: [receiver, sourceA, sourceB],
        });

        executor.execute(
            {
                type: "TRANSFER",
                source: "tag:storage:wood",
                target: "self",
                resource: "wood",
                amount: 2,
            },
            context,
            commands,
        );

        expect(buffer[0]).toEqual({
            type: RuntimeCommandType.TRANSFER_ASSETS,
            payload: {
                sourceId: "source_b",
                targetId: "receiver",
                payload: { wood: 2 },
            },
            metadata: {
                sourceEntityId: "receiver",
                sourceLane: "behavior_rule",
            },
        });
    });
});

