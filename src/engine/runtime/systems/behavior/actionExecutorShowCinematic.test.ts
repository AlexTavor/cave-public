import { describe, expect, it } from "vitest";
import { executeShowCinematicAction } from "./actionExecutorShowCinematic";
import { createCommandBuffer } from "./actionExecutorTestUtils";
import { RuntimeCommandType } from "../../types";

describe("executeShowCinematicAction", () => {
    it("enqueues SHOW_CINEMATIC without mutating state", () => {
        const lines = ["Line 1", "Line 2"];
        const { buffer, commands } = createCommandBuffer();

        executeShowCinematicAction({ type: "SHOW_CINEMATIC", lines }, commands);

        expect(buffer).toEqual([
            {
                type: RuntimeCommandType.SHOW_CINEMATIC,
                payload: { lines: ["Line 1", "Line 2"] },
            },
        ]);
        expect(lines).toEqual(["Line 1", "Line 2"]);
    });
});
