import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { HardTutorialSystem } from "./HardTutorialSystem";
import { createCommandBuffer } from "./testUtils";

describe("HardTutorialSystem priority", () => {
    it("prefers a later gated tutorial over an earlier lingering one", () => {
        const system = new HardTutorialSystem(
            () =>
                [
                    {
                        id: "foraging_exists",
                        label: "Foraging Exists",
                        conditions: [
                            { kind: "entity_tag_present", tag: "foraging" },
                        ],
                    },
                    {
                        id: "can_absorb_safely",
                        label: "Can Absorb Safely",
                        conditions: [
                            { kind: "entity_tag_present", tag: "absorption" },
                            {
                                kind: "fact_threshold",
                                scope: "run",
                                factType: "active_bodies",
                                factAbout: "world",
                                operator: ">=",
                                value: 2,
                            },
                        ],
                    },
                ] as any,
            () =>
                [
                    {
                        id: "modal",
                        presentation: "modal",
                        title: "Ready",
                        text: "Body",
                        attention: [],
                        imageUrl: null,
                    },
                ] as any,
            () =>
                [
                    {
                        id: "foraging_tut_0",
                        selfDefinition: { kind: "entity_tag", tag: "foraging" },
                        enterConditionIds: ["foraging_exists"],
                        guidances: [{ guidanceId: "modal" }],
                    },
                    {
                        id: "absorption_tut_0",
                        selfDefinition: {
                            kind: "entity_tag",
                            tag: "absorption",
                        },
                        enterConditionIds: ["can_absorb_safely"],
                        guidances: [{ guidanceId: "modal" }],
                    },
                ] as any,
        );
        const { buffer, commands } = createCommandBuffer();

        system.tick(
            new Snapshot(
                [
                    {
                        id: "sys_world",
                        state: {},
                        run: { active_bodies: { world: 2 } },
                        permanent: {},
                    },
                    { id: "foraging", tags: ["foraging"] },
                    { id: "absorption", tags: ["absorption"] },
                ],
                { getBody: () => undefined } as any,
                {},
            ),
            commands,
            16,
        );

        expect(buffer[0]).toMatchObject({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: { tutorialId: "absorption_tut_0" } },
        });
    });
});
