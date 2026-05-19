import { describe, expect, it } from "vitest";
import { ShowThoughtHandler } from "./ShowThoughtHandler";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";

describe("ShowThoughtHandler", () => {
    it("writes the active thought to sys_world", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world", draft: { active: false } } as any);

        new ShowThoughtHandler().handle(
            {
                type: RuntimeCommandType.SHOW_THOUGHT,
                payload: {
                    thoughtId: "intro",
                    body: "Hi",
                    rememberScope: "run",
                    resumeStatus: "running",
                },
            },
            context,
        );

        expect((context.world.entities[0] as any).thought).toMatchObject({
            active: true,
            thoughtId: "intro",
        });
    });
});
