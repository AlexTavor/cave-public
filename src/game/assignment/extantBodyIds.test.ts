import { describe, expect, it } from "vitest";
import {
    collectExtantBodyIds,
    countExtantBodies,
    isExtantBodyEntity,
} from "./extantBodyIds";

describe("extantBodyIds", () => {
    it("counts bodies and excludes aggregate-tagged bodies", () => {
        const entities = [
            { id: "body-1", body: {}, tags: [] },
            { id: "body-2", body: {}, tags: ["aggregate"] },
            { id: "other", tags: [] },
        ] as any;

        expect(isExtantBodyEntity(entities[0])).toBe(true);
        expect(isExtantBodyEntity(entities[1])).toBe(false);
        expect(collectExtantBodyIds(entities)).toEqual(["body-1"]);
        expect(countExtantBodies(entities)).toBe(1);
    });
});
