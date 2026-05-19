import { describe, expect, it } from "vitest";
import { resolveConditionRefs } from "./resolveConditionRefs";

describe("resolveConditionRefs", () => {
    it("resolves referenced condition definitions in order", () => {
        const index = new Map<string, any>([
            [
                "a",
                {
                    id: "a",
                    label: "A",
                    selfDefinition: { kind: "auto" },
                    conditions: [
                        { kind: "world_state_boolean", key: "x", value: true },
                    ],
                },
            ],
            [
                "b",
                {
                    id: "b",
                    label: "B",
                    selfDefinition: { kind: "auto" },
                    conditions: [{ kind: "entity_tag_present", tag: "egg" }],
                },
            ],
        ]);
        expect(resolveConditionRefs(index as any, ["a", "b"])).toMatchObject({
            missing: [],
            resolved: [{ id: "a" }, { id: "b" }],
        });
    });

    it("reports missing ids and handles empty refs", () => {
        expect(resolveConditionRefs(new Map<string, any>() as any, [])).toEqual(
            { resolved: [], missing: [] },
        );
        expect(
            resolveConditionRefs(new Map<string, any>() as any, ["missing"])
                .missing,
        ).toEqual(["missing"]);
    });
});
