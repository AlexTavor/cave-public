import { describe, expect, it } from "vitest";
import { createDefaultCaveMind } from "../../../data/schemas/game/caveMind";
import { updateCaveEmotions } from "./updateCaveEmotions";

const runEmotions = (
    overrides: {
        world?: Record<string, unknown>;
        emotions?: Record<string, number>;
        memory?: Record<string, unknown>;
    } = {},
) => {
    const mind = createDefaultCaveMind();
    const memory = {
        ...mind.memory,
        ...overrides.memory,
    } as typeof mind.memory;
    return updateCaveEmotions(
        {
            world: {
                comfort: 0.5,
                elapsedRealSeconds: 0,
                xp: 0,
                level: 1,
                purgeActive: false,
                selectedEntityId: "",
                dragEntityId: "",
                dragActive: false,
                caveWorldX: 0,
                caveWorldY: 0,
                starvingBodies: 0,
                coldBodies: 0,
                explorationCuriosityEntityIds: [],
                assignedNodeCuriosityEntityIds: [],
                firstCycleCuriosityEntityIds: [],
                eventCounters: memory.previousEventCounters,
                ...overrides.world,
            },
            candidates: [],
        },
        { ...mind.emotions, ...overrides.emotions },
        memory,
    );
};

describe("updateCaveEmotions", () => {
    it("lets curiosity fade below happiness without ongoing novelty", () => {
        const next = runEmotions({
            emotions: { happiness: 0.4, sadness: 0, terror: 0, curiosity: 0.4 },
        }).emotions;
        expect(next.happiness).toBeGreaterThan(next.curiosity);
    });

    it("grows worry on a fresh comfort decline", () => {
        const next = runEmotions({
            world: { comfort: 0.4, elapsedRealSeconds: 5 },
            memory: {
                previousComfort: 0.7,
                comfortWindowStartComfort: 0.7,
                comfortWindowStartElapsedS: 0,
            },
        });
        expect(next.emotions.worry).toBeGreaterThan(0);
        expect(next.memoryPatch.comfortDeclineTicks).toBe(1);
    });

    it("reduces worry gain on larger one-tick comfort drops", () => {
        const smallDrop = runEmotions({
            world: { comfort: 0.65, elapsedRealSeconds: 5 },
            memory: {
                previousComfort: 0.8,
                comfortWindowStartComfort: 0.8,
                comfortWindowStartElapsedS: 0,
            },
        });
        const largeDrop = runEmotions({
            world: { comfort: 0.1, elapsedRealSeconds: 5 },
            memory: {
                previousComfort: 0.8,
                comfortWindowStartComfort: 0.8,
                comfortWindowStartElapsedS: 0,
            },
        });
        expect(smallDrop.emotions.worry).toBeGreaterThan(
            largeDrop.emotions.worry,
        );
    });

    it("reduces worry gain across a prolonged decline streak", () => {
        const first = runEmotions({
            world: { comfort: 0.4, elapsedRealSeconds: 5 },
            memory: {
                previousComfort: 0.6,
                comfortWindowStartComfort: 0.6,
                comfortWindowStartElapsedS: 0,
            },
        });
        const prolonged = runEmotions({
            world: { comfort: 0.4, elapsedRealSeconds: 5 },
            emotions: { worry: 0 },
            memory: {
                previousComfort: 0.6,
                comfortDeclineTicks: 3,
                comfortWindowStartComfort: 0.6,
                comfortWindowStartElapsedS: 0,
            },
        });
        expect(first.emotions.worry).toBeGreaterThan(prolonged.emotions.worry);
    });

    it("reduces worry when comfort rises", () => {
        const next = runEmotions({
            world: { comfort: 0.9, elapsedRealSeconds: 1 },
            emotions: { worry: 0.6 },
            memory: {
                previousComfort: 0.5,
                comfortDeclineTicks: 2,
                comfortWindowDelta: -0.2,
            },
        });
        expect(next.emotions.worry).toBeLessThan(0.6);
        expect(next.memoryPatch.comfortDeclineTicks).toBe(0);
    });
});
