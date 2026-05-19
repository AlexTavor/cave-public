import { describe, it, expect } from "vitest";
import { processBodyEntity } from "./processEntity";
import type { RuntimeEntity } from "../../../engine/runtime/types";

const makeEntity = (id: string, body: Record<string, unknown>): RuntimeEntity =>
    ({
        id,
        body: {
            xp: 0,
            xpRate: 0,
            level: 1,
            baseAttributes: { body: 1, mind: 1, social: 1 },
            attributes: { body: 0, mind: 0, social: 0 },
            traits: [],
            passport: {},
            health: 10,
            maxHealth: 10,
            ...body,
        },
    }) as RuntimeEntity;

describe("processBodyEntity", () => {
    it("ceils derived attributes from fractional cave bonus", () => {
        const entity = makeEntity("e1", {
            baseAttributes: { body: 1, mind: 1, social: 1 },
        });

        const result = processBodyEntity(
            entity,
            1000,
            100,
            0.3,
            { body: 1, mind: 1, social: 1 },
            {},
            {},
        );

        const attrs = result.update?.attributes;
        expect(attrs?.body).toBe(1);
        expect(attrs?.mind).toBe(1);
        expect(attrs?.social).toBe(1);
    });

    it("ceils fractional sums upward", () => {
        const entity = makeEntity("e2", {
            baseAttributes: { body: 2, mind: 2, social: 2 },
        });

        const result = processBodyEntity(
            entity,
            1000,
            100,
            0.7,
            { body: 3, mind: 3, social: 3 },
            {},
            {},
        );

        const attrs = result.update?.attributes;
        expect(attrs?.body).toBe(4);
        expect(attrs?.mind).toBe(4);
        expect(attrs?.social).toBe(4);
    });

    it("returns kill when health is zero", () => {
        const entity = makeEntity("dead", { health: 0 });
        const result = processBodyEntity(
            entity,
            1000,
            100,
            1,
            { body: 0, mind: 0, social: 0 },
            {},
            {},
        );
        expect(result.kill).toBe(true);
    });

    it("marks starvation deaths with a death cause", () => {
        const entity = makeEntity("dead", { health: 0, traits: ["starving"] });
        const result = processBodyEntity(
            entity,
            1000,
            100,
            1,
            { body: 0, mind: 0, social: 0 },
            {},
            {},
        );
        expect(result).toMatchObject({ kill: true, deathCause: "starvation" });
    });

    it("does not mark non-starvation deaths with a cause", () => {
        const entity = makeEntity("dead", { health: -1, traits: ["cold"] });
        const result = processBodyEntity(
            entity,
            1000,
            100,
            1,
            { body: 0, mind: 0, social: 0 },
            {},
            {},
        );
        expect(result).toMatchObject({ kill: true, deathCause: undefined });
    });

    it("skips sys_world entity", () => {
        const entity = makeEntity("sys_world", {});
        const result = processBodyEntity(
            entity,
            1000,
            100,
            1,
            { body: 0, mind: 0, social: 0 },
            {},
            {},
        );
        expect(result.update).toBeUndefined();
        expect(result.kill).toBeUndefined();
    });
});

