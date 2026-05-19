import { describe, it, expect } from "vitest";
import { createEntity } from "../../../../../engine/test/factories";
import type { TraitDefinition } from "../../../../../data/schemas/game/traits";
import { Op } from "../../../../../data/schemas/primitives";
import { analyzeEntityState } from "./entityAnalysis";

const makeTraitIndex = (
    overrides: Record<string, Partial<TraitDefinition>> = {},
): Record<string, TraitDefinition> => {
    const result: Record<string, TraitDefinition> = {};
    for (const [id, def] of Object.entries(overrides)) {
        result[id] = { id, label: id, ...def } as TraitDefinition;
    }
    return result;
};

describe("analyzeEntityState", () => {
    it("extracts upkeep modifier from state", () => {
        const entity = createEntity("e1", {
            state: { vals_upkeep_rate_food_0: { value: 0.3 } },
        });
        const { modifiers } = analyzeEntityState(entity, {});
        expect(modifiers).toHaveLength(1);
        expect(modifiers[0]).toEqual({
            targetKey: "food",
            valueStr: "-0.3",
            intervalStr: "/s",
            sourceType: "upkeep",
            sourceId: "upkeep",
        });
    });

    it("extracts power overload modifier", () => {
        const entity = createEntity("e2", {
            powerSink: { efficiency: 3.5 },
        });
        const { modifiers } = analyzeEntityState(entity, {});
        expect(modifiers).toHaveLength(1);
        expect(modifiers[0]).toEqual({
            targetKey: "work speed",
            valueStr: "+250%",
            sourceType: "power",
            sourceId: "overload",
        });
    });

    it("extracts trait with modifier and cycle effects", () => {
        const traitIndex = makeTraitIndex({
            starving: {
                label: "Starving",
                description: "no food",
                modifiers: [{ op: Op.MULT, target: "efficiency", value: 0.75 }],
                cycles: [
                    {
                        id: "drain",
                        periodSeconds: 3,
                        effects: [{ op: Op.SUB, target: "health", value: 1 }],
                    },
                ],
            },
        });
        const entity = createEntity("e3", {
            traits: [{ id: "starving" }],
        });
        const { traits } = analyzeEntityState(entity, traitIndex);
        expect(traits).toHaveLength(1);
        expect(traits[0].label).toBe("Starving");
        expect(traits[0].description).toBe("no food");
        expect(traits[0].effects).toEqual([
            { targetKey: "efficiency", valueStr: "-25%" },
            { targetKey: "health", valueStr: "-0.33", intervalStr: "/s" },
        ]);
    });

    it("returns empty results for bare entity", () => {
        const entity = createEntity("e4");
        const result = analyzeEntityState(entity, {});
        expect(result).toEqual({ modifiers: [], traits: [] });
    });

    it("extracts power brownout modifier", () => {
        const entity = createEntity("e5", {
            powerSink: { efficiency: 0.4 },
        });
        const { modifiers } = analyzeEntityState(entity, {});
        expect(modifiers).toHaveLength(1);
        expect(modifiers[0]).toEqual({
            targetKey: "work speed",
            valueStr: "-60%",
            sourceType: "power",
            sourceId: "brownout",
        });
    });

    it("extracts cave attribute bonuses from body component", () => {
        // Given
        const entity = createEntity("e6", {
            body: {
                attributes: { body: 12, mind: 15, social: 10 },
                baseAttributes: { body: 10, mind: 10, social: 10 },
            },
        });
        // When
        const { modifiers } = analyzeEntityState(entity, {});
        // Then
        const caveModifiers = modifiers.filter((m) => m.sourceId === "cave");
        expect(caveModifiers).toHaveLength(2);
        expect(caveModifiers[0]).toEqual({
            targetKey: "body",
            valueStr: "+2",
            sourceType: "cave",
            sourceId: "cave",
        });
        expect(caveModifiers[1]).toEqual({
            targetKey: "mind",
            valueStr: "+5",
            sourceType: "cave",
            sourceId: "cave",
        });
    });
});
