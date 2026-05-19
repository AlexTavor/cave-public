import { describe, expect, it } from "vitest";
import { getActiveDraftGuidanceTargetOptionId } from "./tutorialSelectors";

describe("getActiveDraftGuidanceTargetOptionId", () => {
    it("returns the first targeted draft option from an active tutorial", () => {
        expect(
            getActiveDraftGuidanceTargetOptionId({
                active: true,
                bindings: [
                    { targetOptionId: null },
                    { targetOptionId: "opt_a" },
                    { targetOptionId: "opt_b" },
                ],
            } as any),
        ).toBe("opt_a");
    });

    it("returns null when the tutorial is inactive or has no draft guidance", () => {
        expect(
            getActiveDraftGuidanceTargetOptionId({
                active: false,
                bindings: [{ targetOptionId: "opt_a" }],
            } as any),
        ).toBeNull();
        expect(
            getActiveDraftGuidanceTargetOptionId({
                active: true,
                bindings: [{ targetOptionId: null }],
            } as any),
        ).toBeNull();
    });
});
