import { describe, expect, it } from "vitest";
import { AcknowledgeThoughtHandler } from "./AcknowledgeThoughtHandler";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";

describe("AcknowledgeThoughtHandler", () => {
    it("increments seen fact and clears the active thought", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            run: {},
            thought: {
                _tag: "thought",
                active: true,
                thoughtId: "intro",
                body: "Hi",
                rememberScope: "run",
                resumeStatus: "paused",
            },
        } as any);

        new AcknowledgeThoughtHandler().handle(
            {
                type: RuntimeCommandType.ACKNOWLEDGE_THOUGHT,
                payload: { thoughtId: "intro" },
            },
            context,
        );

        expect((context.world.entities[0] as any).run.thought_seen.intro).toBe(
            1,
        );
        expect((context.world.entities[0] as any).thought.active).toBe(false);
    });
});
