import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { resolveActiveTutorialOutcome } from "./hardTutorialSystemUtils";

describe("resolveActiveTutorialOutcome modal exits", () => {
    it("keeps the tutorial active after modal acknowledgement when exits exist", () => {
        const snapshot = new Snapshot(
            [{ id: "sys_world" }, { id: "self" }],
            { getBody: () => undefined } as any,
            {},
        );
        const outcome = resolveActiveTutorialOutcome(
            snapshot,
            { id: "intro", exitConditionIds: ["done"] } as any,
            {
                _tag: "tutorial",
                active: true,
                tutorialId: "intro",
                selfId: "self",
                primaryTargetId: null,
                acknowledgedModalBindingId: "bind-1",
                bindings: [
                    {
                        bindingId: "bind-1",
                        guidanceId: "g1",
                        targetId: null,
                        selfTargetId: null,
                        targetOptionId: null,
                        textOverride: null,
                    },
                ],
                attention: {
                    hideNotifications: false,
                    hideTimeControls: true,
                    pauseGame: true,
                    focusEntityIds: [],
                    ringEntityIds: [],
                    cameraFocusEntityId: null,
                    blockNonFocusedInteraction: false,
                },
            },
            new Map([
                [
                    "g1",
                    {
                        id: "g1",
                        presentation: "modal",
                        title: "T",
                        text: "Body",
                        imageUrl: null,
                        attention: [],
                    } as any,
                ],
            ]),
            new Map([
                [
                    "done",
                    {
                        id: "done",
                        label: "Done",
                        conditions: [
                            {
                                kind: "user_interaction",
                                interaction: "self_selected",
                            },
                        ],
                    } as any,
                ],
            ]),
        );

        expect(outcome.kind).toBe("continue");
    });
});
