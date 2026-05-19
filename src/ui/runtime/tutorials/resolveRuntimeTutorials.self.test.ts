import { describe, expect, it, vi } from "vitest";
import { resolveRuntimeGuidances } from "./resolveRuntimeGuidances";

const guidance = {
    id: "self_callout",
    presentation: "node_callout",
    text: "Self",
    slots: ["top"],
    attention: ["hide_all_but_self"],
};

const makeRuntime = (selfTargetId: string | null) =>
    ({
        getCartridge: () => ({
            config: { settings: { guidances: [guidance] } },
        }),
        getEntity: () => ({
            tutorial: {
                active: true,
                bindings: [
                    {
                        bindingId: "intro::0",
                        guidanceId: "self_callout",
                        targetId: "other",
                        selfTargetId,
                        targetOptionId: null,
                        textOverride: null,
                    },
                ],
            },
        }),
    }) as any;

describe("resolveRuntimeGuidances self-directed callouts", () => {
    it("uses selfTargetId instead of the explicit target for self attention", () => {
        expect(resolveRuntimeGuidances(makeRuntime("self"))[0]?.targetId).toBe(
            "self",
        );
    });

    it("suppresses unresolved self-directed callouts", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        expect(resolveRuntimeGuidances(makeRuntime(null))).toEqual([]);
        expect(error).toHaveBeenCalled();
        error.mockRestore();
    });

    it("uses selfTargetId for world-authored node callouts when self differs", () => {
        const runtime = {
            getCartridge: () => ({
                config: {
                    settings: {
                        guidances: [
                            {
                                id: "node",
                                presentation: "node_callout",
                                target: {
                                    kind: "entity_id",
                                    entityId: "sys_world",
                                },
                                slot: "bottom",
                                text: "Hint",
                                attention: [],
                            },
                        ],
                    },
                },
            }),
            getEntity: () => ({
                tutorial: {
                    active: true,
                    bindings: [
                        {
                            bindingId: "intro::0",
                            guidanceId: "node",
                            targetId: "sys_world",
                            selfTargetId: "self",
                            targetOptionId: null,
                            textOverride: null,
                        },
                    ],
                    attention: {
                        hideNotifications: false,
                        hideTimeControls: false,
                        pauseGame: false,
                        focusEntityIds: ["self"],
                        ringEntityIds: [],
                        cameraFocusEntityId: null,
                        blockNonFocusedInteraction: true,
                    },
                },
            }),
        } as any;
        expect(resolveRuntimeGuidances(runtime)[0]?.targetId).toBe("self");
    });
});
