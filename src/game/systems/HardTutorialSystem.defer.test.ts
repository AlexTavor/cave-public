import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { HardTutorialSystem } from "./HardTutorialSystem";
import { createCommandBuffer } from "./testUtils";

describe("HardTutorialSystem deferred candidates", () => {
    it("skips unresolved spawned_with_tag tutorials without completing them", () => {
        const system = new HardTutorialSystem(
            () => [] as any,
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
                        id: "waiting",
                        selfDefinition: {
                            kind: "spawned_with_tag",
                            tag: "egg",
                        },
                        guidances: [{ guidanceId: "modal" }],
                    },
                    {
                        id: "fallback",
                        selfDefinition: {
                            kind: "entity_id",
                            entityId: "sys_world",
                        },
                        guidances: [{ guidanceId: "modal" }],
                    },
                ] as any,
        );
        const { buffer, commands } = createCommandBuffer();

        system.tick(
            new Snapshot(
                [{ id: "sys_world", state: {}, permanent: {} }],
                { getBody: () => undefined } as any,
                {},
            ),
            commands,
            16,
        );

        expect(buffer).toHaveLength(1);
        expect(buffer[0]).toMatchObject({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: { tutorialId: "fallback" } },
        });
    });
});
