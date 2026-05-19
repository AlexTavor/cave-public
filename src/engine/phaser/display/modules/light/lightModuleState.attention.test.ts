import { describe, expect, it } from "vitest";
import { resolveLightState } from "./lightModuleState";

describe("resolveLightState attention suppression", () => {
    it("hides lights for defocused entities during runtime attention", () => {
        expect(
            resolveLightState({
                entity: { __attentionLightSuppressed: true },
                spec: {
                    entityId: "node",
                    radius: 20,
                    style: {
                        light: {
                            alpha: 1,
                            blendMode: "ADD",
                            color: "#ffffff",
                            radiusFactor: 1,
                        },
                    },
                },
            } as any),
        ).toBeNull();
    });
});
