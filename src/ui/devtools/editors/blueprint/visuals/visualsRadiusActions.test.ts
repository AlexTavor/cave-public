import { describe, expect, it } from "vitest";
import { createRadiusVisualActions } from "./visualsRadiusActions";

describe("createRadiusVisualActions", () => {
    it("writes transfer radius bounds", () => {
        const presence = { radius: { min: 1, max: 2 } } as any;
        const actions = createRadiusVisualActions((recipe) => recipe(presence));
        actions.updateRadiusMin(3);
        actions.updateRadiusMax(5);
        expect(presence.radius).toEqual({ min: 3, max: 5 });
    });
});
