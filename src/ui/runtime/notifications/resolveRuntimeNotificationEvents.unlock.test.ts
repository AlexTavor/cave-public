import { describe, expect, it } from "vitest";
import { resolveRuntimeNotificationEvents } from "./resolveRuntimeNotificationEvents";
import {
    makeEligibleBlueprint,
    makeSnapshot,
} from "./runtimeNotificationTestUtils";

describe("resolveRuntimeNotificationEvents unlock", () => {
    it("emits an unlocked event when conditional activation turns on", () => {
        // Given
        const blueprints = { ore_bp: makeEligibleBlueprint("cycle") };
        const prev = makeSnapshot(
            [
                {
                    id: "ore-1",
                    blueprintId: "ore_bp",
                    display: { label: "Ore Vein" },
                    state: { conditional_activation_active: { value: 0 } },
                },
            ],
            blueprints,
        );
        const current = makeSnapshot(
            [
                {
                    id: "ore-1",
                    blueprintId: "ore_bp",
                    display: { label: "Ore Vein" },
                    state: { conditional_activation_active: { value: 1 } },
                },
            ],
            blueprints,
        );

        // When
        expect(resolveRuntimeNotificationEvents([], prev, current)).toEqual(
            expect.arrayContaining([
                {
                    kind: "entity_unlocked",
                    aggregationKey: "entity_unlocked:ore vein",
                    count: 1,
                    entityId: "ore-1",
                    entityLabel: "Ore Vein",
                },
            ]),
        );
    });

    it("emits an unlocked event when only a suffixed activation key turns on", () => {
        // Given
        const blueprints = { gate_bp: makeEligibleBlueprint("assignment") };
        const prev = makeSnapshot(
            [
                {
                    id: "gate-1",
                    blueprintId: "gate_bp",
                    display: { label: "Gate" },
                    state: { conditional_activation_active_1: { value: 0 } },
                },
            ],
            blueprints,
        );
        const current = makeSnapshot(
            [
                {
                    id: "gate-1",
                    blueprintId: "gate_bp",
                    display: { label: "Gate" },
                    state: { conditional_activation_active_1: { value: 1 } },
                },
            ],
            blueprints,
        );

        // When
        expect(resolveRuntimeNotificationEvents([], prev, current)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    kind: "entity_unlocked",
                    aggregationKey: "entity_unlocked:gate",
                    entityId: "gate-1",
                    entityLabel: "Gate",
                }),
            ]),
        );
    });
});
