import type { HabitusEffect } from "../../data/schemas/game/habiti";
import { describe, expect, it } from "vitest";
import { generateHabitusEffectDescription } from "./generateHabitusEffectDescription";

type FailureCase = readonly [HabitusEffect, string];

describe("generateHabitusEffectDescription failures", () => {
    it.each<FailureCase>([
        [
            {
                type: "add_resource_gain_multiplier",
                resource: "",
                amount: 0.1,
                description: "",
            },
            "missing_resource",
        ],
        [
            {
                type: "add_resource_gain_multiplier",
                resource: "   ",
                amount: 0.1,
                description: "",
            },
            "missing_resource",
        ],
        [
            {
                type: "add_producer_output_multiplier",
                producerTag: "",
                amount: 0.1,
                description: "",
            },
            "missing_producer_tag",
        ],
        [
            {
                type: "add_producer_output_multiplier",
                producerTag: "   ",
                amount: 0.1,
                description: "",
            },
            "missing_producer_tag",
        ],
    ])("returns a failure for missing required data %o", (effect, reason) => {
        expect(generateHabitusEffectDescription(effect)).toEqual({
            ok: false,
            reason,
        });
    });

    it("returns a failure when resource or producer tag is omitted", () => {
        expect(
            generateHabitusEffectDescription({
                type: "add_resource_gain_multiplier",
                amount: 0.1,
                description: "",
            } as HabitusEffect),
        ).toEqual({ ok: false, reason: "missing_resource" });
        expect(
            generateHabitusEffectDescription({
                type: "add_producer_output_multiplier",
                amount: 0.1,
                description: "",
            } as HabitusEffect),
        ).toEqual({ ok: false, reason: "missing_producer_tag" });
    });
});
