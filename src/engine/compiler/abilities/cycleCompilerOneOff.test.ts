import { describe, it, expect } from "vitest";
import { createCycleGcRule } from "./cycleCompilerOneOff";

describe("createCycleGcRule", () => {
    it("uses <= operator for storage emptiness check", () => {
        const rule = createCycleGcRule([
            {
                resource: "food",
                capacity: { base: 50, perBody: 0, multPerBody: 0 },
                isDefault: true,
                entropy: { base: 0, perBody: 0, multPerBody: 0 },
                visible: true,
                allowDeposit: false,
                allowWithdraw: true,
                priority: 0,
            },
        ]);

        const storageCondition = rule.conditions.find(
            (c) => c.id === "storage_empty_food",
        );
        expect(storageCondition).toBeDefined();

        const opToken = storageCondition?.tokens.find((t) => t.t === "op");
        expect(opToken?.v).toBe("<=");
    });

    it("kills self when all conditions met", () => {
        const rule = createCycleGcRule([]);
        expect(rule.actions[0]).toEqual({
            type: "KILL",
            entityId: "self",
        });
    });

    it("generates conditions for each storage resource", () => {
        const rule = createCycleGcRule([
            {
                resource: "food",
                capacity: { base: 50, perBody: 0, multPerBody: 0 },
                isDefault: true,
                entropy: { base: 0, perBody: 0, multPerBody: 0 },
                visible: true,
                allowDeposit: false,
                allowWithdraw: true,
                priority: 0,
            },
            {
                resource: "heat",
                capacity: { base: 150, perBody: 0, multPerBody: 0 },
                isDefault: true,
                entropy: { base: 0, perBody: 0, multPerBody: 0 },
                visible: true,
                allowDeposit: false,
                allowWithdraw: true,
                priority: 0,
            },
        ]);

        expect(rule.conditions).toHaveLength(3);
        expect(rule.conditions[0].id).toBe("is_depleted");
        expect(rule.conditions[1].id).toBe("storage_empty_food");
        expect(rule.conditions[2].id).toBe("storage_empty_heat");
    });
});
