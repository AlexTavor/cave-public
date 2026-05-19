import { describe, expect, it } from "vitest";
import { createDefaultCaveMind } from "../../../data/schemas/game/caveMind";
import { updateCaveEmotions } from "./updateCaveEmotions";

const runDrop = (comfort: number) => {
    const mind = createDefaultCaveMind();
    return updateCaveEmotions(
        {
            world: {
                comfort,
                elapsedRealSeconds: 5,
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
        {
            ...mind.memory,
            previousComfort: 0.8,
            comfortWindowStartComfort: 0.8,
            comfortWindowStartElapsedS: 0,
        },
    );
};

describe("updateCaveEmotions worry threshold", () => {
    it("requires a drop greater than one comfort point over five seconds", () => {
        const exactThreshold = runDrop(0.79);
        const aboveThreshold = runDrop(0.789);

        expect(exactThreshold.emotions.worry).toBe(0);
        expect(exactThreshold.memoryPatch.comfortDeclineTicks).toBe(0);
        expect(aboveThreshold.emotions.worry).toBeGreaterThan(0);
        expect(aboveThreshold.memoryPatch.comfortDeclineTicks).toBe(1);
    });
});
