import { describe, expect, it } from "vitest";
import { resolveNextCycleEffectGroups } from "./resolveNextCycleEffectGroups";

const runtime = {
    getCartridge: () => ({
        blueprints: {
            forge: {
                _editor: { abilities: { conversion: [{ id: "Smelter" }] } },
            },
            forge_out: {
                components: {
                    display: { label: "Forged Node", display_key: "heat" },
                },
            },
        },
    }),
} as any;

describe("resolveNextCycleEffectGroups", () => {
    it("builds production and conversion header lines from countdown data", () => {
        // Given
        const groups = [
            {
                id: "prod",
                kind: "production",
                title: "Production",
                effects: [
                    {
                        id: "a",
                        iconId: "wood",
                        label: "wood",
                        valueText: "+3",
                        tone: "positive",
                        tooltipTitle: "Produced",
                        tooltipLines: [],
                    },
                ],
            },
            {
                id: "conv",
                kind: "conversion",
                sourceIndex: 0,
                title: "Conversion",
                effects: [
                    {
                        id: "b",
                        iconId: "wood",
                        label: "wood",
                        valueText: "-2",
                        tone: "negative",
                        tooltipTitle: "Consumed",
                        tooltipLines: [],
                    },
                    {
                        id: "c",
                        iconId: "heat",
                        label: "heat",
                        valueText: "+5",
                        tone: "positive",
                        tooltipTitle: "Produced",
                        tooltipLines: [],
                    },
                ],
            },
        ] as any;

        // When
        const resolved = resolveNextCycleEffectGroups(
            { blueprintId: "forge" } as any,
            runtime,
            groups,
            100,
        );

        // Then
        expect(
            resolved[0].headerLines[0].tokens.map(
                (token) => token.text ?? token.iconId,
            ),
        ).toEqual(["3 ", "wood", " wood", " in 2 s"]);
        expect(resolved[1].title).toBe("Smelter");
        expect(resolved[1].headerLines).toHaveLength(2);
    });

    it("enriches transform lines and omits countdown headers when absent", () => {
        // When
        const [resolved] = resolveNextCycleEffectGroups(
            { blueprintId: "forge" } as any,
            runtime,
            [
                {
                    id: "x",
                    kind: "transform",
                    title: "Transform",
                    effects: [
                        {
                            id: "y",
                            iconId: "unknown",
                            label: "forge_out",
                            valueText: "Transform",
                            tone: "neutral",
                            tooltipTitle: "Transforms",
                            tooltipLines: [],
                        },
                    ],
                },
            ] as any,
            null,
        );

        // Then
        expect(resolved.effects[0]).toEqual(
            expect.objectContaining({ iconId: "heat", label: "Forged Node" }),
        );
        expect(resolved.headerLines).toEqual([]);
    });
});
