import { describe, expect, it } from "vitest";
import { resolveCycleProgressVisual } from "./cycleProgressVisual";

const style = {
    cycleProgress: {
        family: "circle",
        familyRotationDeg: 0,
        color: "#ffffff",
    },
};

const resolve = (entity: Record<string, unknown>, nextStyle: unknown = style) =>
    resolveCycleProgressVisual({
        entity,
        entityId: "preview",
        radius: 24,
        timeMs: 0,
        pulseValue: 0,
        style: nextStyle as never,
        solidStripTextureKey: "solid",
    });

describe("resolveCycleProgressVisual", () => {
    it("treats missing cycle state as full progress", () => {
        const absent = resolve({ state: {} });
        const full = resolve({ state: { cycle: { value: 100, max: 100 } } });

        expect(absent.ropeRequest).toBeTruthy();
        expect(absent.ropeSignature).toBe(full.ropeSignature);
    });

    it("hides the rope when the family is none", () => {
        const result = resolve(
            { state: {} },
            {
                cycleProgress: {
                    family: "none",
                    familyRotationDeg: 0,
                    color: "#ffffff",
                },
            },
        );

        expect(result).toEqual({ ropeRequest: null, ropeSignature: null });
    });
});
