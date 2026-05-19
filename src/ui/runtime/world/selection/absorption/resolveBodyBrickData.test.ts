import { describe, expect, it } from "vitest";
import { resolveBodyBrickData } from "./resolveBodyBrickData";

const makeRuntime = (bodyHabiti: string[]) => {
    const world = { id: "sys_world", cave: { ownedHabiti: ["alpha"] } };
    const body = {
        id: "body-1",
        body: {
            level: 2,
            health: 7,
            maxHealth: 9,
            habiti: bodyHabiti,
            attributes: { body: 1, mind: 2, social: 3 },
            baseAttributes: { body: 1, mind: 2, social: 3 },
            passport: { name: "Ada" },
        },
    };
    const carrier = {
        id: "carrier-1",
        carrier: { commands: [{ type: "GAIN_HABITI", habitusId: "beta" }] },
    };
    const entities = [world, carrier, body];
    return {
        getEntity: (id: string) => entities.find((entry) => entry.id === id),
        getEntities: () => entities,
    } as any;
};

describe("resolveBodyBrickData", () => {
    it("treats habiti in carriers as already known to the cave", () => {
        const data = resolveBodyBrickData("body-1", makeRuntime(["beta"]));
        expect(data?.hasUnownedHabiti).toBe(false);
    });

    it("keeps truly unknown habiti marked as unowned", () => {
        const data = resolveBodyBrickData("body-1", makeRuntime(["gamma"]));
        expect(data?.hasUnownedHabiti).toBe(true);
    });
});
