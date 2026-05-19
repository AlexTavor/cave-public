import { describe, expect, it } from "vitest";
import { createDefaultCaveMind } from "../../../data/schemas/game/caveMind";
import { updateCaveEmotions } from "./updateCaveEmotions";

const runBoredom = (
    memory: Record<string, unknown>,
    world: Record<string, unknown>,
) => {
    const mind = createDefaultCaveMind();
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
                eventCounters: mind.memory.previousEventCounters,
                ...world,
            },
            candidates: [],
        },
        mind.emotions,
        { ...mind.memory, ...memory } as typeof mind.memory,
    );
};

describe("updateCaveEmotions boredom", () => {
    it("reduces repeated curiosity from the same node", () => {
        const first = runBoredom(
            {},
            { explorationCuriosityEntityIds: ["node-a"] },
        );
        const second = runBoredom(
            { curiosityNodes: first.memoryPatch.curiosityNodes },
            { explorationCuriosityEntityIds: ["node-a"] },
        );
        expect(first.emotions.curiosity).toBeGreaterThan(
            second.emotions.curiosity,
        );
    });

    it("recovers boredom while idle and restores more curiosity later", () => {
        const bored = runBoredom(
            { curiosityNodes: { "node-a": { boredom01: 0.6 } } },
            { explorationCuriosityEntityIds: ["node-a"] },
        );
        const recovered = runBoredom(
            { curiosityNodes: { "node-a": { boredom01: 0.6 } } },
            {},
        );
        const rebound = runBoredom(
            { curiosityNodes: recovered.memoryPatch.curiosityNodes },
            { explorationCuriosityEntityIds: ["node-a"] },
        );
        expect(
            recovered.memoryPatch.curiosityNodes["node-a"].boredom01,
        ).toBeLessThan(0.6);
        expect(rebound.emotions.curiosity).toBeGreaterThan(
            bored.emotions.curiosity,
        );
    });
});
