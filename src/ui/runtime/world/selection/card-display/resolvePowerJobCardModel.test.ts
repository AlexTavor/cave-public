import { describe, expect, it } from "vitest";
import type { PowerJobCardData } from "../job-card/jobCardTypes";
import { resolvePowerJobCardModel } from "./resolvePowerJobCardModel";

const makeData = (): PowerJobCardData => ({
    variant: "job",
    label: "Forge",
    description: "Turns wood into heat.",
    sink: { baseDemand: { body: 10, mind: 0, social: 0 } } as any,
    liveEfficiency: 0.5,
    analysis: {
        cycleCurrent: 5,
        cycleMax: 9,
        ticksRemaining: 100,
        nextCycleGroups: [
            {
                id: "prod",
                kind: "production",
                title: "Production",
                effects: [
                    {
                        id: "wood",
                        iconId: "wood",
                        label: "Wood",
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
                        id: "heat",
                        iconId: "heat",
                        label: "Heat",
                        valueText: "+5",
                        tone: "positive",
                        tooltipTitle: "Produced",
                        tooltipLines: [],
                    },
                ],
            },
        ],
    },
    storageModels: [
        {
            id: "fuel",
            entityId: "job-1",
            valuePath: "state.food.value",
            maxPath: "state.food.max",
            current: 3,
            max: 6,
            color: "#1",
            iconId: "food",
            title: "Fuel",
            valueText: "3/6",
            tooltipTitle: "Fuel",
            tooltipLines: [],
        },
    ],
    traits: [
        {
            traitId: "warm",
            label: "Warm",
            description: "desc",
            effects: [{ targetKey: "body", valueStr: "+1", intervalStr: "/s" }],
        } as any,
    ],
    suspiciousActivity: {
        text: "Risky",
        color: "#f00",
        tooltipTitle: "Suspicious Activity",
        tooltipLines: ["Warn"],
    },
});

const runtime = {
    getCartridge: () => ({
        blueprints: {
            forge: {
                _editor: { abilities: { conversion: [{ id: "Smelter" }] } },
            },
        },
    }),
} as any;

describe("resolvePowerJobCardModel", () => {
    it("replaces the old power displays with generic sections and capsules", () => {
        const model = resolvePowerJobCardModel(
            makeData(),
            { id: "job-1", blueprintId: "forge" } as any,
            runtime,
        );
        expect(model.badges?.[0]?.value).toEqual({ text: "Risky" });
        expect(model.sections[0]?.capsules?.[0]).toEqual(
            expect.objectContaining({
                testId: "power-body",
                value: expect.objectContaining({
                    binding: expect.objectContaining({
                        kind: "numeric-text",
                        valuePath: "powerSink.efficiency",
                        multiplier: 10,
                    }),
                    maxText: "10",
                }),
            }),
        );
        expect(model.sections[1]?.capsules?.[1]?.value).toEqual({
            binding: {
                id: "job-1:cycle:time:text",
                kind: "cycle-countdown",
                entityId: "job-1",
            },
        });
        expect(
            model.sections.find((section) => section.title === "Production")
                ?.capsules?.[0]?.title,
        ).toBe("Wood");
        expect(
            model.sections.find((section) => section.title === "Smelter")
                ?.capsules?.[0]?.value,
        ).toEqual({ text: "+5" });
        expect(
            model.sections.find((section) => section.id === "job-1:storage")
                ?.capsules?.[0]?.progress?.maxPath,
        ).toBe("state.food.max");
        expect(
            model.sections.find((section) => section.title === "Effects"),
        ).toBeUndefined();
    });
});
