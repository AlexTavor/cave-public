import type { HabitusEffect } from "../../data/schemas/game/habiti";
import { describe, expect, it } from "vitest";
import { generateHabitusEffectDescription } from "./generateHabitusEffectDescription";

type SuccessCase = readonly [HabitusEffect, string];

describe("generateHabitusEffectDescription", () => {
    it.each<SuccessCase>([
        [
            {
                type: "add_cave_attribute",
                attribute: "body",
                amount: 1,
                description: "",
            },
            "+1 [icon=attr_body]Body",
        ],
        [
            {
                type: "add_absorption_xp_conversion",
                amount: 0.05,
                description: "",
            },
            "+5% [icon=xp]XP",
        ],
        [
            {
                type: "add_resource_gain_multiplier",
                resource: "wood",
                amount: 0.1,
                description: "",
            },
            "+10% [icon=wood]Wood",
        ],
        [
            {
                type: "add_producer_output_multiplier",
                producerTag: "hommlet",
                amount: 0.1,
                description: "",
            },
            "+10% to all [icon=hommlet]Hommlet production",
        ],
    ])("generates the authored description for %o", (effect, description) => {
        expect(generateHabitusEffectDescription(effect)).toEqual({
            ok: true,
            description,
        });
    });

    it("preserves raw ids and capitalizes only the first visible character", () => {
        const result = generateHabitusEffectDescription({
            type: "add_resource_gain_multiplier",
            resource: "silver_coin",
            amount: 0.25,
            description: "",
        });
        expect(result).toEqual({
            ok: true,
            description: "+25% [icon=silver_coin]Silver_coin",
        });
    });

    it("returns the same output for repeated calls with the same effect", () => {
        const effect = {
            type: "add_producer_output_multiplier",
            producerTag: "hommlet",
            amount: 0.1,
            description: "",
        } as const;
        expect(generateHabitusEffectDescription(effect)).toEqual(
            generateHabitusEffectDescription(effect),
        );
    });
});
