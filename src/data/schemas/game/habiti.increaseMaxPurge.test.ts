import { describe, expect, it } from "vitest";
import { HabitusEffectSchema } from "./habiti";

describe("HabitusEffectSchema increase_max_purge", () => {
    it("accepts the shared purge-progress effect shape", () => {
        expect(
            HabitusEffectSchema.parse({
                type: "increase_max_purge",
                amount: 25,
                description: "",
            }),
        ).toEqual({
            type: "increase_max_purge",
            amount: 25,
            description: "",
        });
    });
});
