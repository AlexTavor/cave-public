import { describe, expect, it } from "vitest";
import { SpawnerAbilitySchema } from "./spawner";

describe("SpawnerAbilitySchema", () => {
    it("accepts shared structured conditions", () => {
        const parsed = SpawnerAbilitySchema.parse({
            blueprintId: "worker",
            conditions: [
                {
                    kind: "world_state_threshold",
                    key: "food",
                    operator: ">=",
                    value: 1,
                },
            ],
        });
        expect(parsed.conditions).toHaveLength(1);
        expect(parsed.conditions[0]).toMatchObject({
            kind: "world_state_threshold",
            key: "food",
        });
    });

    it("rejects legacy free-form string conditions", () => {
        expect(() =>
            SpawnerAbilitySchema.parse({
                blueprintId: "worker",
                conditions: ["self.state.ready.value == 1"],
            }),
        ).toThrow();
    });
});
