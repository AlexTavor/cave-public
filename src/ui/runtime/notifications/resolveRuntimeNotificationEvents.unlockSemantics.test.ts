import { describe, expect, it } from "vitest";
import { resolveRuntimeNotificationEvents } from "./resolveRuntimeNotificationEvents";
import {
    makeEligibleBlueprint,
    makeSnapshot,
} from "./runtimeNotificationTestUtils";

describe("resolveRuntimeNotificationEvents unlock semantics", () => {
    it("does not emit unlocked when an already-active node first appears", () => {
        // Given
        const blueprints = { fresh_bp: makeEligibleBlueprint("cycle") };
        const current = makeSnapshot(
            [
                {
                    id: "fresh-1",
                    blueprintId: "fresh_bp",
                    display: { label: "Fresh Node" },
                    state: { conditional_activation_active: { value: 1 } },
                },
            ],
            blueprints,
        );

        // When / Then
        expect(
            resolveRuntimeNotificationEvents([], makeSnapshot([]), current),
        ).toEqual([]);
    });

    it("matches UI lock semantics and ignores stale conditional targets", () => {
        const blueprints = {
            bp_gate: makeEligibleBlueprint("cycle", {
                conditionalActivation: [
                    {
                        inactiveExplanation: "Need gate",
                        targets: [{ ability: "cycle" }],
                    },
                    {
                        inactiveExplanation: "Stale",
                        targets: [{ ability: "spawner", targetId: "missing" }],
                    },
                ],
            }),
        };

        // Given
        const prev = makeSnapshot(
            [
                {
                    id: "gate-ui",
                    blueprintId: "bp_gate",
                    display: { label: "Gate UI" },
                    state: {
                        conditional_activation_active: { value: 0 },
                        conditional_activation_active_1: { value: 0 },
                    },
                },
            ],
            blueprints,
        );
        const current = makeSnapshot(
            [
                // When
                {
                    id: "gate-ui",
                    blueprintId: "bp_gate",
                    display: { label: "Gate UI" },
                    state: {
                        conditional_activation_active: { value: 1 },
                        conditional_activation_active_1: { value: 0 },
                    },
                },
            ],
            blueprints,
        );

        expect(resolveRuntimeNotificationEvents([], prev, current)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    kind: "entity_unlocked",
                    aggregationKey: "entity_unlocked:gate ui",
                    entityId: "gate-ui",
                }),
            ]),
        );
    });

    it("does not emit unlocked for ineligible blueprints", () => {
        // Given
        const blueprints = { plain_bp: { _editor: { abilities: {} } } };
        const prev = makeSnapshot(
            [
                {
                    id: "plain-1",
                    blueprintId: "plain_bp",
                    display: { label: "Plain Node" },
                    state: { conditional_activation_active: { value: 0 } },
                },
            ],
            blueprints,
        );
        const current = makeSnapshot(
            [
                {
                    id: "plain-1",
                    blueprintId: "plain_bp",
                    display: { label: "Plain Node" },
                    state: { conditional_activation_active: { value: 1 } },
                },
            ],
            blueprints,
        );

        // When / Then
        expect(resolveRuntimeNotificationEvents([], prev, current)).toEqual([]);
    });
});
