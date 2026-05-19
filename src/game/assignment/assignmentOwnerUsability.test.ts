import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { isAssignmentOwnerUsable } from "./assignmentOwnerUsability";

const snapshot = (entities: any[], blueprints = {}) =>
    new Snapshot(entities as any, { getBody: () => undefined } as any, blueprints as any);

describe("assignmentOwnerUsability", () => {
    it("uses live conditional-activation conditions instead of stale active-state flags", () => {
        const owner = {
            id: "node-1",
            blueprintId: "what_am_i",
            cycle: {},
            state: { conditional_activation_active: { value: 0 } },
        };
        const snap = snapshot(
            [
                { id: "sys_world", run: { habitus_owned: { Human: 1 } } },
                owner,
            ],
            {
                what_am_i: {
                    _editor: {
                        abilities: {
                            cycle: {},
                            conditionalActivation: {
                                conditions: [
                                    {
                                        kind: "fact_threshold",
                                        scope: "run",
                                        factType: "habitus_owned",
                                        factAbout: "Human",
                                        operator: ">=",
                                        value: 1,
                                    },
                                ],
                                targets: [{ ability: "cycle" }],
                            },
                        },
                    },
                },
            },
        );

        expect(isAssignmentOwnerUsable(snap, owner as any)).toBe(true);
    });
});