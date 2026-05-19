import { describe, expect, it } from "vitest";
import { draftCompiler } from "./draftCompiler";
import { createBlueprint } from "../../test/factories";

const makeBlueprint = () =>
    createBlueprint("bp_entity", {
        components: { state: { cycle: { value: 0, max: 10, visible: true } } },
    });

describe("draftCompiler onComplete", () => {
    it("includes onComplete actions when provided", () => {
        const blueprint = makeBlueprint();

        draftCompiler(
            blueprint,
            {
                poolId: "pool",
                count: 2,
                conditions: [],
                onComplete: [{ type: "SHOW_CINEMATIC", lines: ["Done"] }],
            },
            0,
        );

        expect(blueprint.components.behavior?.rules?.[0]?.actions[0]).toEqual({
            type: "TRIGGER_DRAFT",
            poolId: "pool",
            count: 2,
            triggerEntityId: "self",
            onComplete: [{ type: "SHOW_CINEMATIC", lines: ["Done"] }],
        });
    });

    it("omits onComplete when absent", () => {
        const blueprint = makeBlueprint();

        draftCompiler(
            blueprint,
            { poolId: "pool", count: 2, conditions: [] },
            0,
        );

        expect(
            blueprint.components.behavior?.rules?.[0]?.actions[0],
        ).not.toHaveProperty("onComplete");
    });
});
