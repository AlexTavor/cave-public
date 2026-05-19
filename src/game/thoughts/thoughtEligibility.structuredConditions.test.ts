import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { selectEligibleThought } from "./thoughtEligibility";

const snap = (world: Record<string, unknown>) =>
    new Snapshot([world as any], { getBody: () => undefined } as any);

describe("selectEligibleThought structured conditions", () => {
    it("returns the first unseen thought when all conditions are true", () => {
        const thoughts = [
            {
                id: "eligible",
                body: "A",
                rememberScope: "run",
                conditions: [
                    {
                        kind: "world_state_threshold",
                        key: "food",
                        operator: ">=",
                        value: 1,
                    },
                    {
                        kind: "fact_threshold",
                        scope: "run",
                        factType: "elapsed_real_seconds",
                        factAbout: "world",
                        operator: ">=",
                        value: 3,
                    },
                ],
            },
        ];
        const result = selectEligibleThought(
            thoughts as any,
            snap({
                id: "sys_world",
                run: { thought_seen: {}, elapsed_real_seconds: { world: 4 } },
                state: { food: { value: 2 } },
            }),
        );
        expect(result?.id).toBe("eligible");
    });

    it("returns null when any structured condition is false or already seen", () => {
        const thoughts = [
            {
                id: "seen",
                body: "A",
                rememberScope: "run",
                conditions: [
                    {
                        kind: "world_state_threshold",
                        key: "food",
                        operator: ">=",
                        value: 1,
                    },
                ],
            },
        ];
        const result = selectEligibleThought(
            thoughts as any,
            snap({
                id: "sys_world",
                run: { thought_seen: { seen: 1 } },
                state: { food: { value: 0 } },
            }),
        );
        expect(result).toBeNull();
    });
});
