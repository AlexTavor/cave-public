import { describe, expect, it } from "vitest";
import { sanitizeBlueprintAbilities } from "./moduleStore.abilitySanitizer";
import { createBlueprint } from "../../../engine/test/factories";

const invalidCondition = {
    kind: "world_state_threshold",
    value: 1,
} as any;

describe("moduleStore spawner condition sanitization", () => {
    it("keeps valid structured spawner conditions and removes invalid ones", () => {
        const blueprint = createBlueprint("entity_alpha", {
            _editor: {
                abilities: {
                    spawner: [
                        {
                            id: "spawner_1",
                            blueprintId: "egg",
                            count: { base: 1, perBody: 0, multPerBody: 0 },
                            mode: "spawn_body",
                            target: "sys_world",
                            conditions: [
                                {
                                    kind: "world_state_threshold",
                                    key: "ready",
                                    operator: ">=",
                                    value: 1,
                                },
                                invalidCondition,
                            ],
                        },
                    ],
                },
            },
        });

        const result = sanitizeBlueprintAbilities(blueprint);
        expect(result.conditionsRemoved).toBe(1);
        expect(
            result.blueprint._editor?.abilities?.spawner?.[0]?.conditions,
        ).toEqual([
            expect.objectContaining({
                kind: "world_state_threshold",
                key: "ready",
                operator: ">=",
                value: 1,
            }),
        ]);
    });
});
