import { describe, expect, it } from "vitest";
import { buildConditionalActivationTargetOptions } from "./conditionalActivationTargetOptions";

describe("conditionalActivationTargetOptions", () => {
    it("marks assignment as a targetable ability", () => {
        const [option] = buildConditionalActivationTargetOptions(
            {
                assignment: {
                    slots: 1,
                    locking: false,
                    filter: [],
                    minimums: [],
                    duration: 10,
                    showProgress: false,
                    oneOff: false,
                    results: [],
                },
            } as any,
            [{ ability: "assignment" }],
        );
        expect(option).toMatchObject({
            label: "Assignment",
            checked: true,
            targetable: true,
            target: { ability: "assignment" },
        });
    });

    it("returns one row per authored ability instance in editor order", () => {
        const options = buildConditionalActivationTargetOptions(
            {
                cycle: {
                    maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                    inputs: {},
                    oneOff: false,
                    conditions: [],
                },
                production: [
                    {
                        id: "prod-1",
                        resource: "wood",
                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                        conditions: [],
                    },
                ],
                triggeredActions: [
                    {
                        id: "ta-1",
                        triggers: ["assignment_complete"],
                        conditions: [],
                        actions: [
                            { type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 },
                        ],
                    },
                ],
                storage: [
                    {
                        resource: "wood",
                        displayName: "",
                        capacity: { base: 1, perBody: 0, multPerBody: 0 },
                        entropy: { base: 0, perBody: 0, multPerBody: 0 },
                        isDefault: true,
                        visible: true,
                        allowDeposit: true,
                    },
                ],
            } as any,
            [{ ability: "production", targetId: "prod-1" }],
        );
        expect(options.map((option) => option.label)).toEqual([
            "Cycle",
            "wood-storage",
            "wood-production",
            "Triggered Actions 1",
        ]);
        expect(options[1]).toMatchObject({
            targetable: false,
            disabledReason: expect.any(String),
        });
        expect(options[2]).toMatchObject({
            checked: true,
            targetable: true,
            target: { ability: "production", targetId: "prod-1" },
        });
        expect(options[3]).toMatchObject({
            checked: false,
            targetable: true,
            target: { ability: "triggeredActions", targetId: "ta-1" },
        });
    });
});
