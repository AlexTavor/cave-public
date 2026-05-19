import { describe, expect, it, vi } from "vitest";
import { resolveTutorialAttentionPlan } from "./resolveTutorialAttentionPlan";

describe("resolveTutorialAttentionPlan", () => {
    it("uses selfTargetId for self-directed focus and ring targeting", () => {
        const bindings = [
            { guidanceId: "node", targetId: "ignored", selfTargetId: "self" },
            { guidanceId: "screen", targetId: null },
            { guidanceId: "node2", targetId: "ignored", selfTargetId: "self" },
        ];
        const guidances = new Map<string, any>([
            [
                "node",
                {
                    id: "node",
                    presentation: "node_callout",
                    attention: [
                        "hide_all_but_self",
                        "show_attention_effect_on_self",
                    ],
                },
            ],
            [
                "screen",
                {
                    id: "screen",
                    presentation: "screen_callout",
                    attention: ["hide_notifications", "stop_time"],
                },
            ],
            [
                "node2",
                {
                    id: "node2",
                    presentation: "node_callout",
                    attention: ["show_attention_effect_on_self"],
                },
            ],
        ]);
        expect(
            resolveTutorialAttentionPlan(bindings, guidances as any),
        ).toMatchObject({
            hideNotifications: true,
            pauseGame: true,
            blockNonFocusedInteraction: true,
            focusEntityIds: ["self"],
            ringEntityIds: ["self"],
            cameraFocusEntityId: "self",
        });
    });

    it("ignores draft_guidance for focus and ring targeting", () => {
        expect(
            resolveTutorialAttentionPlan(
                [
                    {
                        guidanceId: "draft",
                        targetId: null,
                        targetOptionId: "opt",
                    },
                ],
                new Map([
                    [
                        "draft",
                        {
                            id: "draft",
                            presentation: "draft_guidance",
                            attention: ["stop_time", "hide_notifications"],
                        },
                    ],
                ]) as any,
            ),
        ).toMatchObject({
            pauseGame: true,
            hideNotifications: true,
            focusEntityIds: [],
            ringEntityIds: [],
            cameraFocusEntityId: null,
        });
    });

    it("logs and suppresses self-directed attention when selfTargetId is missing", () => {
        const errorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        expect(
            resolveTutorialAttentionPlan(
                [{ guidanceId: "node", targetId: "egg" }],
                new Map([
                    [
                        "node",
                        {
                            id: "node",
                            presentation: "node_callout",
                            attention: [
                                "hide_all_but_self",
                                "show_attention_effect_on_self",
                            ],
                        },
                    ],
                ]) as any,
            ),
        ).toMatchObject({
            focusEntityIds: [],
            ringEntityIds: [],
            cameraFocusEntityId: null,
        });
        expect(errorSpy).toHaveBeenCalledTimes(2);
        errorSpy.mockRestore();
    });
});
