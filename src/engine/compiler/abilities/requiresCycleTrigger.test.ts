import { describe, expect, it } from "vitest";
import { requiresCycleTrigger } from "./requiresCycleTrigger";

describe("requiresCycleTrigger", () => {
    it("uses cycle presence semantics", () => {
        const cycleOnly = requiresCycleTrigger(["cycle_complete"]);
        const assignmentOnly = requiresCycleTrigger(["assignment_complete"]);
        const mixed = requiresCycleTrigger([
            "cycle_complete",
            "assignment_complete",
        ]);

        expect(requiresCycleTrigger(undefined)).toBe(true);
        expect(cycleOnly).toBe(true);
        expect(assignmentOnly).toBe(false);
        expect(mixed).toBe(true);
    });
});
