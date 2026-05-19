import { describe, expect, it } from "vitest";
import { generateHabitusEffectDescription } from "./generateHabitusEffectDescription";

describe("generateHabitusEffectDescription increase_max_purge", () => {
    it("returns the authored max-purge description deterministically", () => {
        expect(
            generateHabitusEffectDescription({
                type: "increase_max_purge",
                amount: 25,
                description: "",
            }),
        ).toEqual({
            ok: true,
            description:
                "+25 max [color=gold]Suspicion[/color] - delays the Purge",
        });
    });
});
