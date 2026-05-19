import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import { RuntimeCommandType } from "../../types";
import {
    buildBehaviorContext,
    createCommandBuffer,
} from "./actionExecutorTestUtils";

describe("ActionExecutor gain understanding", () => {
    it("emits a GAIN_UNDERSTANDING command with behavior metadata", () => {
        const executor = new ActionExecutor();
        const { buffer, commands } = createCommandBuffer();
        const context = buildBehaviorContext({ self: { id: "actor" } as any });

        executor.execute(
            {
                type: "GAIN_UNDERSTANDING",
                understandingId: "insight",
                entityId: "sys_world",
            },
            context,
            commands,
        );

        expect(buffer).toEqual([
            {
                type: RuntimeCommandType.GAIN_UNDERSTANDING,
                payload: { entityId: "sys_world", understandingId: "insight" },
                metadata: {
                    sourceEntityId: "actor",
                    sourceLane: "behavior_rule",
                },
            },
        ]);
    });
});
