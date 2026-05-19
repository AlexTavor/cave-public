import { describe, expect, it, vi } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { HardTutorialSystem } from "./HardTutorialSystem";
import { createCommandBuffer } from "./testUtils";

describe("HardTutorialSystem invalid candidates", () => {
    it("completes invalid candidates and chains to the next eligible tutorial", () => {
        const spy = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        const system = new HardTutorialSystem(
            () => [] as any,
            () =>
                [
                    {
                        id: "good",
                        presentation: "modal",
                        title: "Good",
                        text: "Body",
                        attention: [],
                        imageUrl: null,
                    },
                ] as any,
            () =>
                [
                    {
                        id: "bad",
                        selfDefinition: { kind: "auto" },
                        guidances: [{ guidanceId: "missing" }],
                    },
                    {
                        id: "good_tutorial",
                        selfDefinition: {
                            kind: "entity_id",
                            entityId: "sys_world",
                        },
                        guidances: [{ guidanceId: "good" }],
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

        expect(buffer[0]).toMatchObject({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: { tutorialId: "good_tutorial" } },
        });
        expect(buffer[1]).toMatchObject({
            type: "ADJUST_FACT",
            payload: { factAbout: "bad" },
        });
        spy.mockRestore();
    });
});
