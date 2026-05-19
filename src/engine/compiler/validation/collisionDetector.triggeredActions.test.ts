import { describe, expect, it } from "vitest";
import { collisionDetector } from "./collisionDetector";

describe("collisionDetector triggeredActions", () => {
    it("emits a dependency error when cycle_complete is used without cycle", () => {
        const issues = collisionDetector({
            abilities: {
                triggeredActions: [
                    {
                        id: "ta-1",
                        triggers: ["cycle_complete"],
                        conditions: [],
                        actions: [
                            { type: "KILL_ALL_BODIES_EXCEPT", quantity: 1 },
                        ],
                    },
                ],
            },
        });
        expect(
            issues.some((i) => i.id === "triggered_actions_requires_cycle"),
        ).toBe(true);
    });

    it("does not emit a cycle dependency error for assignment_complete only", () => {
        const issues = collisionDetector({
            abilities: {
                triggeredActions: [
                    {
                        id: "ta-1",
                        triggers: ["assignment_complete"],
                        conditions: [],
                        actions: [
                            { type: "KILL_ALL_BODIES_EXCEPT", quantity: 1 },
                        ],
                    },
                ],
            },
        });
        expect(
            issues.some((i) => i.id === "triggered_actions_requires_cycle"),
        ).toBe(false);
    });
});
