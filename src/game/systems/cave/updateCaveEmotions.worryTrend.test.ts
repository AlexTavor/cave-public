import { describe, expect, it } from "vitest";
import { createDefaultCaveMind } from "../../../data/schemas/game/caveMind";
import { resolveDominantCaveEmotion } from "./resolveDominantCaveEmotion";
import { updateCaveEmotions } from "./updateCaveEmotions";

type MindSlice = Pick<
    ReturnType<typeof createDefaultCaveMind>,
    "emotions" | "memory"
>;

const tick = (comfort: number, elapsedRealSeconds: number, mind: MindSlice) => {
    const next = updateCaveEmotions(
        {
            world: {
                comfort,
                elapsedRealSeconds,
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
                eventCounters: mind.memory.previousEventCounters,
            },
            candidates: [],
        },
        mind.emotions,
        mind.memory,
    );
    return {
        emotions: next.emotions,
        memory: {
            ...mind.memory,
            ...next.memoryPatch,
            previousComfort: comfort,
        },
    };
};

const seed = (previousComfort: number, worry = 0, delta = 0): MindSlice => {
    const mind = createDefaultCaveMind();
    return {
        emotions: { ...mind.emotions, worry },
        memory: {
            ...mind.memory,
            previousComfort,
            comfortWindowStartComfort: previousComfort,
            comfortWindowStartElapsedS: 0,
            comfortWindowDelta: delta,
        },
    };
};

const run = (values: number[], mind: MindSlice) =>
    values.reduce(
        (next, comfort, index) => tick(comfort, index + 1, next),
        mind,
    );

describe("updateCaveEmotions worry trends", () => {
    it("lets near-full comfort drift clear existing worry", () => {
        const mind = run([0.9937, 0.9934, 0.9931], seed(0.994, 0.7));
        expect(mind.emotions.worry).toBeLessThan(0.5);
        expect(resolveDominantCaveEmotion(mind.emotions)).toBe("happy");
    });

    it("clears worry quickly once comfort starts rising", () => {
        const mind = run([0.85, 0.89, 0.94, 0.98], seed(0.82, 0.7, -0.09));
        expect(mind.emotions.worry).toBeLessThan(0.2);
        expect(resolveDominantCaveEmotion(mind.emotions)).toBe("happy");
    });

    it("stays worried during a steady comfort decline", () => {
        const mind = run([0.79, 0.76, 0.73, 0.7, 0.67, 0.64, 0.61], seed(0.82));
        expect(mind.emotions.worry).toBeGreaterThan(mind.emotions.happiness);
        expect(resolveDominantCaveEmotion(mind.emotions)).toBe("worried");
    });

    it("keeps the decline streak through tiny upward jitter", () => {
        const mind = run(
            [
                0.79, 0.7906, 0.76, 0.7608, 0.73, 0.7306, 0.71, 0.7106, 0.69,
                0.67,
            ],
            seed(0.82),
        );
        expect(mind.memory.comfortDeclineTicks).toBeGreaterThan(1);
        expect(resolveDominantCaveEmotion(mind.emotions)).toBe("worried");
    });

    it("becomes worried from many small falling steps", () => {
        const mind = run([0.79, 0.78, 0.77, 0.76, 0.75, 0.74, 0.73], seed(0.8));
        expect(mind.emotions.worry).toBeGreaterThan(0);
        expect(resolveDominantCaveEmotion(mind.emotions)).toBe("worried");
    });
});
