import { describe, expect, it } from "vitest";
import { makeConditionalActivationFixture } from "../conditionalActivationTestUtils";
import { resolveConditionalActivationExplanation } from "./resolveConditionalActivationExplanation";

describe("resolveConditionalActivationExplanation", () => {
    it("returns explanation only for inactive entities with valid targets", () => {
        const { entity, runtime } = makeConditionalActivationFixture();
        expect(
            resolveConditionalActivationExplanation(entity.id, runtime),
        ).toBe("Needs power.");
        expect(
            resolveConditionalActivationExplanation(
                entity.id,
                makeConditionalActivationFixture({ active: true }).runtime,
            ),
        ).toBeNull();
    });

    it("returns null for blank explanation, empty targets, stale targets, or missing runtime data", () => {
        expect(
            resolveConditionalActivationExplanation(
                "entity-1",
                makeConditionalActivationFixture({ explanation: "   " })
                    .runtime,
            ),
        ).toBeNull();
        expect(
            resolveConditionalActivationExplanation(
                "entity-1",
                makeConditionalActivationFixture({
                    blueprint: {
                        _editor: {
                            abilities: {
                                conditionalActivation: {
                                    targets: [],
                                    inactiveExplanation: "Needs power.",
                                },
                            },
                        },
                    },
                }).runtime,
            ),
        ).toBeNull();
        expect(
            resolveConditionalActivationExplanation(
                "entity-1",
                makeConditionalActivationFixture({
                    blueprint: {
                        _editor: {
                            abilities: {
                                conditionalActivation: {
                                    targets: [
                                        {
                                            ability: "production",
                                            targetId: "gone",
                                        },
                                    ],
                                    inactiveExplanation: "Needs power.",
                                },
                            },
                        },
                    },
                }).runtime,
            ),
        ).toBeNull();
        expect(
            resolveConditionalActivationExplanation("missing", null),
        ).toBeNull();
    });

    it("prefers the highest-priority inactive explanation and breaks ties by order", () => {
        const fixture = makeConditionalActivationFixture({
            conditionalActivation: [
                {
                    priority: 1,
                    conditions: [],
                    targets: [{ ability: "cycle" }],
                    inactiveExplanation: "Low priority.",
                },
                {
                    priority: 3,
                    conditions: [],
                    targets: [{ ability: "cycle" }],
                    inactiveExplanation: "High priority.",
                },
                {
                    priority: 3,
                    conditions: [],
                    targets: [{ ability: "cycle" }],
                    inactiveExplanation: "Tie but later.",
                },
            ],
        });
        expect(
            resolveConditionalActivationExplanation(
                fixture.entity.id,
                fixture.runtime,
            ),
        ).toBe("High priority.");
    });
});
