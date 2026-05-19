import { describe, expect, it } from "vitest";
import { makeNode, makeWorld, runMind } from "./CaveMindSystem.testUtils";

describe("CaveMindSystem emotion memory", () => {
    it("persists worry and decline ticks when comfort falls", () => {
        const baseWorld = makeWorld();
        const world = makeWorld({
            state: { ...baseWorld.state, comfort: { value: 0.3, max: 1 } },
            run: { elapsed_real_seconds: { world: 5 } },
            cave: {
                ...baseWorld.cave,
                mind: {
                    ...baseWorld.cave.mind,
                    memory: {
                        ...baseWorld.cave.mind.memory,
                        previousComfort: 0.7,
                        comfortWindowStartComfort: 0.7,
                        comfortWindowStartElapsedS: 0,
                    },
                },
            } as any,
        });
        const command = runMind([world]);
        expect(command.payload.mind.emotions.worry).toBeGreaterThan(0);
        expect(command.payload.mind.memory.comfortDeclineTicks).toBe(1);
        expect(command.payload.mind.memory.comfortWindowDelta).toBeLessThan(0);
    });

    it("persists curiosity node boredom memory for contributing nodes", () => {
        const world = makeWorld();
        const exploring = makeNode("exploring", {
            tags: ["cave_exploration"],
            state: {
                cycle: { value: 1, max: 10 },
                cycle_active: { value: true },
            },
        });
        const command = runMind([world, exploring]);
        expect(
            command.payload.mind.memory.curiosityNodes.exploring.boredom01,
        ).toBeGreaterThan(0);
    });

    it("tracks assigned power nodes as curiosity contributors", () => {
        const world = makeWorld();
        const assigned = makeNode("assigned", {
            assignment: { assignedIds: ["body-1"] },
            powerSink: {},
        });
        const command = runMind([world, assigned]);
        expect(
            command.payload.mind.memory.curiosityNodes.assigned.boredom01,
        ).toBeGreaterThan(0);
    });
});
