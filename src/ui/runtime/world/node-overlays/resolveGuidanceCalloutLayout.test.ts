import { describe, expect, it } from "vitest";
import { resolveGuidanceCalloutLayout } from "./resolveGuidanceCalloutLayout";

const runtime = {
    getPhysicsBody: (id: string) =>
        ({
            a: { position: { x: 0, y: 0 }, radius: 10 },
            b: { position: { x: 0, y: 0 }, radius: 10 },
        })[id],
} as any;

describe("resolveGuidanceCalloutLayout", () => {
    it("falls back for colliding node and screen callouts in binding order", () => {
        const models = resolveGuidanceCalloutLayout({
            runtime,
            camera: { centerX: 0, centerY: 0, zoom: 1 },
            width: 300,
            height: 200,
            guidances: [
                {
                    guidance: {
                        id: "a",
                        presentation: "node_callout",
                        slot: "top",
                        text: "A",
                        imageUrl: null,
                    },
                    binding: {
                        bindingId: "a",
                        guidanceId: "a",
                        targetId: "a",
                        textOverride: null,
                    },
                },
                {
                    guidance: {
                        id: "b",
                        presentation: "node_callout",
                        slot: "top",
                        text: "B",
                        imageUrl: null,
                    },
                    binding: {
                        bindingId: "b",
                        guidanceId: "b",
                        targetId: "b",
                        textOverride: null,
                    },
                },
                {
                    guidance: {
                        id: "c",
                        presentation: "screen_callout",
                        screenSlot: "top_left",
                        text: "C",
                        imageUrl: null,
                    },
                    binding: {
                        bindingId: "c",
                        guidanceId: "c",
                        targetId: null,
                        textOverride: null,
                    },
                },
            ] as any,
        });
        expect(models.map((item) => item.bindingId)).toEqual(["a", "b", "c"]);
        expect(models[0]?.x).not.toBe(models[1]?.x);
    });

    it("ignores draft_guidance layout entries", () => {
        expect(
            resolveGuidanceCalloutLayout({
                runtime,
                camera: { centerX: 0, centerY: 0, zoom: 1 },
                width: 300,
                height: 200,
                guidances: [
                    {
                        guidance: {
                            id: "draft",
                            presentation: "draft_guidance",
                            targetOptionId: "opt_a",
                            attention: [],
                        },
                        binding: {
                            bindingId: "draft",
                            guidanceId: "draft",
                            targetId: null,
                            textOverride: null,
                        },
                    },
                ] as any,
            }),
        ).toEqual([]);
    });
});
