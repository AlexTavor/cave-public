import { describe, expect, it } from "vitest";
import { TutorialsSchema } from "./tutorials";

describe("TutorialsSchema", () => {
    it("parses a valid concurrent tutorial wrapper", () => {
        expect(
            TutorialsSchema.parse([
                {
                    id: "intro",
                    selfDefinition: { kind: "auto" },
                    enterConditionIds: ["game_started"],
                    guidances: [{ guidanceId: "intro_modal" }],
                    exitConditionIds: ["intro_done"],
                },
            ]),
        ).toHaveLength(1);
    });

    it("rejects duplicate tutorial ids", () => {
        expect(() =>
            TutorialsSchema.parse([
                { id: "dup", guidances: [{ guidanceId: "a" }] },
                { id: "dup", guidances: [{ guidanceId: "b" }] },
            ]),
        ).toThrow(/Duplicate tutorial id/);
    });

    it("parses self variants and optional target overrides", () => {
        expect(
            TutorialsSchema.parse([
                {
                    id: "throttle",
                    selfDefinition: { kind: "entity_tag", tag: "egg" },
                    guidances: [
                        {
                            guidanceId: "throttle_modal",
                            titleOverride: "Urgent",
                            targetOverride: {
                                kind: "entity_tag",
                                tag: "cave_exploration",
                            },
                        },
                    ],
                },
                {
                    id: "delayed",
                    selfDefinition: {
                        kind: "spawned_with_tag",
                        tag: "hatched_egg",
                    },
                },
            ]),
        ).toHaveLength(2);
    });

    it("rejects legacy steps and retry payloads", () => {
        expect(() =>
            TutorialsSchema.parse([
                { id: "legacy", steps: [{ retry: { delayGameSeconds: 1 } }] },
            ]),
        ).toThrow();
    });

    it("accepts omitted and authored onComplete actions", () => {
        expect(TutorialsSchema.parse([{ id: "intro" }])[0]?.onComplete).toEqual(
            [],
        );
        expect(
            TutorialsSchema.parse([
                {
                    id: "intro",
                    onComplete: [
                        {
                            type: "MUTATE",
                            target: "global.tutorial_mode",
                            op: "SET",
                            value: 0,
                        },
                    ],
                },
            ])[0]?.onComplete,
        ).toHaveLength(1);
    });
});
