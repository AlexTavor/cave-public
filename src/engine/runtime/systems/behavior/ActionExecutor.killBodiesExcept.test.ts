import { describe, expect, it } from "vitest";
import { RuntimeCommandType, type RuntimeEntity } from "../../types";
import { ActionExecutor } from "./ActionExecutor";
import {
    buildBehaviorContext,
    createCommandBuffer,
} from "./actionExecutorTestUtils";

describe("ActionExecutor KILL_ALL_BODIES_EXCEPT", () => {
    it("emits the runtime command with scoped metadata", () => {
        const entity: RuntimeEntity = { id: "entity_a" };
        const { buffer, commands } = createCommandBuffer();

        new ActionExecutor().execute(
            { type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 },
            buildBehaviorContext({ self: entity }),
            commands,
        );

        expect(buffer).toEqual([
            {
                type: RuntimeCommandType.KILL_ALL_BODIES_EXCEPT,
                payload: { quantity: 2 },
                metadata: {
                    sourceEntityId: "entity_a",
                    sourceLane: "behavior_rule",
                },
            },
        ]);
    });
});
