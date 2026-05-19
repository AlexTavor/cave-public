import { describe, expect, it } from "vitest";
import { TriggeredActionsAbilitySchema } from "./triggeredActions";

describe("TriggeredActionsAbilitySchema", () => {
    it("parses a valid entry with one action", () => {
        const parsed = TriggeredActionsAbilitySchema.parse({
            actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 }],
        });
        expect(parsed.actions).toEqual([
            { type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 },
        ]);
    });

    it("rejects empty actions", () => {
        expect(() =>
            TriggeredActionsAbilitySchema.parse({ actions: [] }),
        ).toThrow();
    });

    it("defaults triggers and conditions", () => {
        const parsed = TriggeredActionsAbilitySchema.parse({
            actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 1 }],
        });
        expect(parsed.triggers).toEqual(["cycle_complete"]);
        expect(parsed.conditions).toEqual([]);
    });
});
