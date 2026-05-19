import { describe, expect, it } from "vitest";
import { createCycleProgressVisualActions } from "./visualsCycleProgressActions";

describe("createCycleProgressVisualActions", () => {
    it("writes the nested cycle progress fields", () => {
        const style = {} as Record<string, unknown>;
        const actions = createCycleProgressVisualActions((recipe) =>
            recipe(style),
        );
        actions.updateCycleProgressFamily("hex");
        actions.updateCycleProgressFamilyRotation(720);
        actions.updateCycleProgressColor("#abcdef");
        expect(style).toMatchObject({
            cycleProgress: {
                family: "hex",
                familyRotationDeg: 360,
                color: "#abcdef",
            },
        });
    });
});
