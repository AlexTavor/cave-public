import { describe, expect, it } from "vitest";
import { ActionExecutor } from "./ActionExecutor";
import {
    buildBehaviorContext,
    createCommandBuffer,
} from "./actionExecutorTestUtils";
import { RuntimeCommandType } from "../../types";

describe("ActionExecutor SHOW_CINEMATIC", () => {
    it("dispatches cinematic actions through the dedicated executor", () => {
        const executor = new ActionExecutor();
        const { buffer, commands } = createCommandBuffer();

        executor.execute(
            { type: "SHOW_CINEMATIC", lines: ["Done"] },
            buildBehaviorContext({ self: { id: "entity_a" } }),
            commands,
        );

        expect(buffer[0]).toEqual({
            type: RuntimeCommandType.SHOW_CINEMATIC,
            payload: { lines: ["Done"] },
            metadata: {
                sourceEntityId: "entity_a",
                sourceLane: "behavior_rule",
            },
        });
    });
});
