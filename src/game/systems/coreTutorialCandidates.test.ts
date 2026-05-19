import { describe, expect, it } from "vitest";
import snapshot from "../../../public/bootstrap/vfs-prod.json";
import { evaluateTutorialCandidate } from "./evaluateTutorialCandidate";
import { Snapshot } from "../../engine/runtime/Snapshot";
import type { ConditionDefinition } from "../../data/schemas/conditions";
import type { GuidanceDefinition } from "../../data/schemas/guidances";
import type { TutorialDefinition } from "../../data/schemas/tutorials";

const files = snapshot as unknown as Record<string, unknown>;
const core = structuredClone(files["example/modules/core.cave"]) as {
    conditions: ConditionDefinition[];
    guidances: GuidanceDefinition[];
    tutorials: TutorialDefinition[];
};
const conditions = new Map<string, ConditionDefinition>(
    core.conditions.map((item) => [item.id, item]),
);
const guidances = new Map<string, GuidanceDefinition>(
    core.guidances.map((item) => [item.id, item]),
);
const tutorial = (id: string) => {
    const found = core.tutorials.find((item) => item.id === id);
    if (!found) throw new Error(`Missing tutorial '${id}'.`);
    return found;
};
const world = (params: {
    run?: Record<string, unknown>;
    state?: Record<string, unknown>;
}) =>
    new Snapshot(
        [
            {
                id: "sys_world",
                state: {
                    food: { value: 5 },
                    heat: { value: 5 },
                    ...params.state,
                },
                run: {
                    elapsed_game_seconds: { world: 0 },
                    ...params.run,
                },
                permanent: {},
            },
        ],
        { getBody: () => undefined } as any,
        {},
    );

describe("core tutorial candidates", () => {
    it("activates the shipped cave-status tutorials", () => {
        expect(
            evaluateTutorialCandidate(
                world({ state: { food: { value: 0 } } }),
                tutorial("out_of_food_tut"),
                guidances,
                conditions,
            ),
        ).toMatchObject({
            kind: "eligible",
            state: { tutorialId: "out_of_food_tut" },
        });
        expect(
            evaluateTutorialCandidate(
                world({ state: { heat: { value: 0 } } }),
                tutorial("out_of_heat_tut"),
                guidances,
                conditions,
            ),
        ).toMatchObject({
            kind: "eligible",
            state: { tutorialId: "out_of_heat_tut" },
        });
    });

    it("activates the shipped purge and body-count tutorials", () => {
        expect(
            evaluateTutorialCandidate(
                world({ run: { purge_began: { world: 1 } } }),
                tutorial("purge_tutorial"),
                guidances,
                conditions,
            ),
        ).toMatchObject({
            kind: "eligible",
            state: { tutorialId: "purge_tutorial" },
        });
        expect(
            evaluateTutorialCandidate(
                world({ run: { active_bodies: { world: 3 } } }),
                tutorial("3_bodies"),
                guidances,
                conditions,
            ),
        ).toMatchObject({
            kind: "eligible",
            state: { tutorialId: "3_bodies" },
        });
    });
});
