import { describe, expect, it } from "vitest";
import { resolveRuntimeGuidances } from "./resolveRuntimeGuidances";

const makeRuntime = (active = true) => {
    const cartridge = {
        config: {
            settings: {
                guidances: [
                    {
                        id: "throttle_modal",
                        presentation: "modal",
                        title: "Throttle",
                        text: "Throttle body",
                        attention: [],
                    },
                    {
                        id: "hint_callout",
                        presentation: "node_callout",
                        text: "Hint",
                        slots: ["top"],
                        attention: [],
                    },
                ],
            },
        },
    };
    return {
        getCartridge: () => cartridge,
        getEntity: () => ({
            tutorial: {
                active,
                acknowledgedModalBindingId: null,
                bindings: [
                    {
                        bindingId: "intro::0",
                        guidanceId: "throttle_modal",
                        targetId: null,
                        selfTargetId: null,
                        targetOptionId: null,
                        titleOverride: "Override title",
                        textOverride: "Override",
                    },
                    {
                        bindingId: "intro::1",
                        guidanceId: "hint_callout",
                        targetId: "explore-1",
                        selfTargetId: null,
                        targetOptionId: null,
                        textOverride: null,
                    },
                ],
                attention: {
                    hideNotifications: true,
                    hideTimeControls: false,
                    pauseGame: true,
                    focusEntityIds: ["explore-1"],
                    ringEntityIds: [],
                    cameraFocusEntityId: null,
                    blockNonFocusedInteraction: true,
                },
            },
        }),
    } as any;
};

describe("resolveRuntimeGuidances", () => {
    it("returns active authored guidances in binding order", () => {
        const runtime = makeRuntime();
        expect(
            resolveRuntimeGuidances(runtime).map((item) => item.guidance.id),
        ).toEqual(["throttle_modal", "hint_callout"]);
        expect(resolveRuntimeGuidances(runtime)[0].binding.titleOverride).toBe(
            "Override title",
        );
        expect(resolveRuntimeGuidances(runtime)[0].binding.textOverride).toBe(
            "Override",
        );
    });

    it("returns nothing when the runtime tutorial is inactive", () => {
        expect(resolveRuntimeGuidances(makeRuntime(false))).toEqual([]);
    });

    it("suppresses an acknowledged modal guidance while leaving other bindings", () => {
        const runtime = makeRuntime();
        const tutorial = runtime.getEntity().tutorial;
        runtime.getEntity = () => ({
            tutorial: {
                ...tutorial,
                acknowledgedModalBindingId: "intro::0",
            },
        });

        expect(
            resolveRuntimeGuidances(runtime).map((item) => item.guidance.id),
        ).toEqual(["hint_callout"]);
    });
});
