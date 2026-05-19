import { describe, expect, it } from "vitest";
import { resolveSelectionLens } from "./selectionLensMap";

describe("selectionLensMap job", () => {
    it("matches processing nodes but not generic assignment owners", () => {
        const jobLens = resolveSelectionLens(
            {
                id: "butcher",
                assignment: { assignedIds: [] },
                state: { assignment_duration: { value: 12 } },
            } as any,
            null,
        );
        const pointerLens = resolveSelectionLens(
            {
                id: "sys_pointer",
                assignment: { assignedIds: ["body-1"] },
            } as any,
            null,
        );

        expect(jobLens?.id).toBe("job");
        expect(pointerLens?.id).not.toBe("job");
    });
});
