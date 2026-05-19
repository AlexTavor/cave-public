import { describe, expect, it } from "vitest";
import { AssignmentAbilitySchema } from "./assignment";

const parse = (value: Record<string, unknown>) =>
    AssignmentAbilitySchema.safeParse(value);

describe("AssignmentAbilitySchema", () => {
    it("accepts destroy, transfer, and multiple spawn-resource results", () => {
        const result = parse({
            results: [
                { type: "destroy_assigned_bodies" },
                { type: "transfer_habiti" },
                {
                    type: "spawn_resource",
                    resource: "xp",
                    source: "lifetime_xp",
                },
                {
                    type: "spawn_resource",
                    resource: "food",
                    source: "fixed",
                    target: "self",
                },
            ],
        });
        expect(result.success).toBe(true);
    });

    it("rejects duplicate destroy results", () => {
        expect(
            parse({
                results: [
                    { type: "destroy_assigned_bodies" },
                    { type: "destroy_assigned_bodies" },
                ],
            }).success,
        ).toBe(false);
    });

    it("rejects duplicate transfer results", () => {
        expect(
            parse({
                results: [
                    { type: "transfer_habiti" },
                    { type: "transfer_habiti" },
                ],
            }).success,
        ).toBe(false);
    });

    it("rejects attribute outputs without an attribute", () => {
        expect(
            parse({
                results: [
                    {
                        type: "spawn_resource",
                        resource: "xp",
                        source: "attribute",
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it("rejects non-attribute outputs with an authored attribute", () => {
        expect(
            parse({
                results: [
                    {
                        type: "spawn_resource",
                        resource: "xp",
                        source: "fixed",
                        attribute: "body",
                    },
                ],
            }).success,
        ).toBe(false);
    });

    it("defaults oneOff to false", () => {
        const result = parse({});
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.oneOff).toBe(false);
    });

    it("defaults results to an empty array", () => {
        const result = parse({});
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.results).toEqual([]);
    });
});
