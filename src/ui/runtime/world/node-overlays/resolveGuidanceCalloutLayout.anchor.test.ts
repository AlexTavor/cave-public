import { describe, expect, it } from "vitest";
import { resolveGuidanceCalloutLayout } from "./resolveGuidanceCalloutLayout";

const runtime = {
    getPhysicsBody: () => ({ position: { x: 0, y: 0 }, radius: 10 }),
} as any;

describe("resolveGuidanceCalloutLayout anchor", () => {
    it("places bottom node callouts below the target instead of above it", () => {
        const models = resolveGuidanceCalloutLayout({
            runtime,
            camera: { centerX: 0, centerY: 0, zoom: 1 },
            width: 300,
            height: 200,
            guidances: [
                {
                    guidance: {
                        id: "top",
                        presentation: "node_callout",
                        slot: "top",
                        text: "Top",
                        imageUrl: null,
                    },
                    binding: {
                        bindingId: "top",
                        guidanceId: "top",
                        targetId: "a",
                        textOverride: null,
                    },
                },
                {
                    guidance: {
                        id: "bottom",
                        presentation: "node_callout",
                        slot: "bottom",
                        text: "Bottom",
                        imageUrl: null,
                    },
                    binding: {
                        bindingId: "bottom",
                        guidanceId: "bottom",
                        targetId: "a",
                        textOverride: null,
                    },
                },
            ] as any,
        });
        expect(models[0]).toMatchObject({ anchor: "above", x: 150, y: 90 });
        expect(models[1]).toMatchObject({ anchor: "below", x: 150, y: 110 });
    });
});
