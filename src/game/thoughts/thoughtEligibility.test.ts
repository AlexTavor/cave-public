import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { selectEligibleThought } from "./thoughtEligibility";

const snap = (world: Record<string, unknown>) =>
    new Snapshot([world as any], { getBody: () => undefined } as any);

describe("selectEligibleThought", () => {
    it("returns the first unseen thought with satisfied conditions", () => {
        const thoughts = [
            { id: "seen", body: "A", rememberScope: "run", conditions: [] },
            {
                id: "eligible",
                body: "B",
                rememberScope: "run",
                conditions: [
                    {
                        id: "c1",
                        sortKey: "1",
                        kind: "world_state_threshold",
                        key: "food",
                        operator: ">=",
                        value: 1,
                    },
                ],
            },
        ] as any;

        const result = selectEligibleThought(
            thoughts,
            snap({
                id: "sys_world",
                run: { thought_seen: { seen: 1 } },
                state: { food: { value: 2 } },
            }),
        );

        expect(result?.id).toBe("eligible");
    });

    it("returns null when a thought is already active", () => {
        const result = selectEligibleThought(
            [
                { id: "t1", body: "A", rememberScope: "run", conditions: [] },
            ] as any,
            snap({ id: "sys_world", thought: { active: true } }),
        );

        expect(result).toBeNull();
    });
});
