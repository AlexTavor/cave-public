import { describe, expect, it } from "vitest";
import { UpdateCaveHandler } from "./UpdateCaveHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";

describe("UpdateCaveHandler understanding", () => {
    it("stores owned understanding as a sorted unique list", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world", cave: {} });

        new UpdateCaveHandler().handle(
            {
                type: RuntimeCommandType.UPDATE_CAVE,
                payload: {
                    entityId: "sys_world",
                    ownedUnderstanding: ["insight", "ancient", "insight"],
                },
            },
            context,
        );

        expect(
            (context.world.entities[0] as any).cave.ownedUnderstanding,
        ).toEqual(["ancient", "insight"]);
    });
});
