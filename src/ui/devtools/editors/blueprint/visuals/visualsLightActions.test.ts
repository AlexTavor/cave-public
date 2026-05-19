import { describe, expect, it } from "vitest";
import { createLightVisualActions } from "./visualsLightActions";

describe("createLightVisualActions", () => {
    it("defaults light color from cycle progress", () => {
        const style = { cycleProgress: { color: "#123456" } } as any;
        const actions = createLightVisualActions((recipe) => recipe(style));
        actions.updateLightEnabled(true);
        expect(style.light.color).toBe("#123456");
    });
});
