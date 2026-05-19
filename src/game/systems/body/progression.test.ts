import { describe, it, expect } from "vitest";
import type { BodyComponent } from "../../../data/schemas/game/body";
import { calculateBodyProgression } from "./progression";

const baseBody: BodyComponent = {
    xp: 0,
    xpRate: 1,
    level: 1,
    baseAttributes: { body: 1, mind: 1, social: 1 },
    attributes: { body: 1, mind: 1, social: 1 },
    traits: [] as string[],
    habiti: [],
    passport: { name: "" },
    assignmentId: "sys_world",
    assignmentStatus: "orbiting",
    health: 100,
    maxHealth: 100,
};

describe("calculateBodyProgression", () => {
    it("increments level when threshold is reached", () => {
        const result = calculateBodyProgression(
            { ...baseBody, xp: 90 },
            20000,
            100,
            "test-entity",
        );

        expect(result.level).toBe(2);
        expect(result.xp).toBeCloseTo(10);
        expect(result.baseAttributes).toEqual({ body: 1, mind: 1, social: 2 });
    });
});

