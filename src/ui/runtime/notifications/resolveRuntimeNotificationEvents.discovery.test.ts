import { describe, expect, it } from "vitest";
import { resolveRuntimeNotificationEvents } from "./resolveRuntimeNotificationEvents";
import {
    makeEligibleBlueprint,
    makeSnapshot,
    makeSpawnCommand,
} from "./runtimeNotificationTestUtils";

describe("resolveRuntimeNotificationEvents discovery", () => {
    it("discovers cycle and assignment nodes without draft provenance", () => {
        // Given
        const prev = makeSnapshot([]);
        const blueprints = {
            cycle_bp: makeEligibleBlueprint("cycle"),
            assignment_bp: makeEligibleBlueprint("assignment"),
        };
        const current = makeSnapshot(
            [
                {
                    id: "cycle-1",
                    blueprintId: "cycle_bp",
                    display: { label: "Cycle Node" },
                },
                {
                    id: "assignment-1",
                    blueprintId: "assignment_bp",
                    label: "Assignment Node",
                },
            ],
            blueprints,
        );
        const commands = [
            makeSpawnCommand("cycle-1", "cycle_bp", {
                sourceLane: "behavior_rule",
            }),
            makeSpawnCommand("assignment-1", "assignment_bp"),
        ];

        // When
        const result = resolveRuntimeNotificationEvents(
            commands,
            prev,
            current,
        );

        // Then
        expect(result).toEqual(
            expect.arrayContaining([
                {
                    kind: "entity_discovered",
                    aggregationKey: "entity_discovered:cycle node",
                    count: 1,
                    entityId: "cycle-1",
                    entityLabel: "Cycle Node",
                },
                {
                    kind: "entity_discovered",
                    aggregationKey: "entity_discovered:assignment node",
                    count: 1,
                    entityId: "assignment-1",
                    entityLabel: "Assignment Node",
                },
            ]),
        );
    });

    it("does not discover ineligible blueprints even from draft provenance", () => {
        // Given
        const prev = makeSnapshot([]);
        const current = makeSnapshot(
            [{ id: "plain-1", blueprintId: "plain_bp", label: "Plain Node" }],
            { plain_bp: { _editor: { abilities: {} } } },
        );

        // When
        const result = resolveRuntimeNotificationEvents(
            [
                makeSpawnCommand("plain-1", "plain_bp", {
                    sourceLane: "draft_option",
                }),
            ],
            prev,
            current,
        );

        // Then
        expect(
            result.filter((item) => item.kind === "entity_discovered"),
        ).toEqual([]);
    });

    it("uses display label, entity label, then id for discovery labels", () => {
        // Given
        const prev = makeSnapshot([]);
        const current = makeSnapshot(
            [
                {
                    id: "display-1",
                    blueprintId: "eligible_bp",
                    display: { label: "Display Label" },
                    label: "Ignored Label",
                },
                {
                    id: "label-1",
                    blueprintId: "eligible_bp",
                    label: "Entity Label",
                },
                { id: "id-only-1", blueprintId: "eligible_bp" },
            ],
            { eligible_bp: makeEligibleBlueprint("cycle") },
        );

        // When
        const result = resolveRuntimeNotificationEvents(
            [
                makeSpawnCommand("display-1", "eligible_bp"),
                makeSpawnCommand("label-1", "eligible_bp"),
                makeSpawnCommand("id-only-1", "eligible_bp"),
            ],
            prev,
            current,
        );

        // Then
        expect(result).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ entityLabel: "Display Label" }),
                expect.objectContaining({ entityLabel: "Entity Label" }),
                expect.objectContaining({ entityLabel: "id-only-1" }),
            ]),
        );
    });
});
