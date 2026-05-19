import { describe, expect, it } from "vitest";
import { makeWorld, runMind } from "./CaveMindSystem.testUtils";

describe("CaveMindSystem emotions", () => {
    it("raises terror and picks panic on purge begin", () => {
        const baseWorld = makeWorld();
        const world = makeWorld({
            state: { ...baseWorld.state, cave_evt_purge_began: { value: 1 } },
            cave: {
                ...baseWorld.cave,
                purge: { isActive: true, nextKillTimer: 1 },
                mind: {
                    ...baseWorld.cave.mind,
                    memory: {
                        ...baseWorld.cave.mind.memory,
                        previousEventCounters: {
                            purgeBegan: 0,
                            purgeKill: 0,
                            absorptionComplete: 0,
                            butchered: 0,
                        },
                    },
                },
            } as any,
        });
        const command = runMind([world]);
        expect(command.payload.mind.emotions.terror).toBeGreaterThan(0.3);
        expect(command.payload.mind.pulsePresetKey).toBe("panic");
    });

    it("raises happiness on absorption completion and comfort rise", () => {
        const baseWorld = makeWorld();
        const world = makeWorld({
            state: {
                ...baseWorld.state,
                comfort: { value: 0.7, max: 1 },
                cave_evt_absorption_complete: { value: 1 },
            },
            cave: {
                ...baseWorld.cave,
                mind: {
                    ...baseWorld.cave.mind,
                    memory: {
                        ...baseWorld.cave.mind.memory,
                        previousComfort: 0.4,
                        previousEventCounters: {
                            purgeBegan: 0,
                            purgeKill: 0,
                            absorptionComplete: 0,
                            butchered: 0,
                        },
                    },
                },
            } as any,
        });
        const command = runMind([world]);
        expect(command.payload.mind.emotions.happiness).toBeGreaterThan(0.2);
    });

    it("raises curiosity on xp gain and level gain", () => {
        const baseWorld = makeWorld();
        const world = makeWorld({
            cave: {
                ...baseWorld.cave,
                progression: { xp: 12, level: 2, skillpoints: 0 },
                mind: {
                    ...baseWorld.cave.mind,
                    memory: {
                        ...baseWorld.cave.mind.memory,
                        previousXp: 0,
                        previousLevel: 1,
                    },
                },
            } as any,
        });
        const command = runMind([world]);
        expect(command.payload.mind.emotions.curiosity).toBeGreaterThan(0.1);
        expect(command.payload.mind.emotions.happiness).toBeGreaterThan(0.2);
    });

    it("raises sadness on butchered counters", () => {
        const baseWorld = makeWorld();
        const world = makeWorld({
            state: { ...baseWorld.state, cave_evt_butchered: { value: 1 } },
            cave: {
                ...baseWorld.cave,
                mind: {
                    ...baseWorld.cave.mind,
                    memory: {
                        ...baseWorld.cave.mind.memory,
                        previousEventCounters: {
                            purgeBegan: 0,
                            purgeKill: 0,
                            absorptionComplete: 0,
                            butchered: 0,
                        },
                    },
                },
            } as any,
        });
        const command = runMind([world]);
        expect(command.payload.mind.emotions.sadness).toBeGreaterThan(0.2);
    });
});
