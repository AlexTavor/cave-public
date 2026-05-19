import { describe, it, expect } from "vitest";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import { getMalformedAbilityIssues } from "./collisionDetector.malformed";

const makeStorage = (resource: string) => ({
    resource,
    capacity: { base: 0, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
});

const makeProduction = (resource: string) => ({
    resource,
    amount: { base: 0, perBody: 0, multPerBody: 0 },
    conditions: [],
});

const makeUpkeep = (resource: string) => ({
    resource,
    rate: { base: 0, perBody: 0, multPerBody: 0 },
    failureTrait: "is_starving",
    autoRequest: true,
});

const makeAbilities = (
    overrides: Partial<EditorAbilities>,
): EditorAbilities => ({
    ...overrides,
});

describe("getMalformedAbilityIssues", () => {
    it("returns errors for missing resources", () => {
        const abilities = makeAbilities({
            storage: [makeStorage(""), makeStorage("wood")],
            production: [makeProduction(" ")],
            upkeep: [makeUpkeep("\n")],
        });

        const issues = getMalformedAbilityIssues(abilities);
        expect(issues.some((issue) => issue.id === "storage_invalid_0")).toBe(
            true,
        );
        expect(
            issues.some((issue) => issue.id === "production_invalid_0"),
        ).toBe(true);
        expect(issues.some((issue) => issue.id === "upkeep_invalid_0")).toBe(
            true,
        );
    });

    it("flags conversion inputs and outputs with missing resources", () => {
        const abilities = makeAbilities({
            conversion: [
                {
                    id: "conv",
                    inputs: [{ resource: "", amount: { base: 1, perBody: 0, multPerBody: 0 } }],
                    outputs: [
                        { resource: " ", amount: { base: 2, perBody: 0, multPerBody: 0 } },
                    ],
                    resetCycle: true,
                    conditions: [],
                },
            ],
        });

        const issues = getMalformedAbilityIssues(abilities);
        expect(
            issues.some((issue) => issue.id === "conversion_invalid_0"),
        ).toBe(true);
    });

    it("returns empty when resources are valid", () => {
        const abilities = makeAbilities({
            storage: [makeStorage("wood")],
            production: [makeProduction("food")],
            upkeep: [makeUpkeep("heat")],
            conversion: [
                {
                    id: "conv",
                    inputs: [
                        { resource: "ore", amount: { base: 1, perBody: 0, multPerBody: 0 } },
                    ],
                    outputs: [
                        { resource: "metal", amount: { base: 2, perBody: 0, multPerBody: 0 } },
                    ],
                    resetCycle: true,
                    conditions: [],
                },
            ],
        });

        const issues = getMalformedAbilityIssues(abilities);
        expect(issues).toHaveLength(0);
    });
});

