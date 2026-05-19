import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { draftCompiler } from "./draftCompiler";
import { createBlueprint } from "../../test/factories";

const makeCycleBlueprint = (id = "bp_entity") =>
    createBlueprint(id, {
        components: { state: { cycle: { value: 0, max: 100, visible: true } } },
    });

const validConfig = { poolId: "tier_1_pool", count: 3, conditions: [] };

describe("draftCompiler", () => {
    beforeEach(() => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("emits a TRIGGER_DRAFT rule targeting the executing entity", () => {
        // Given
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(blueprint, validConfig, 0);

        // Then
        const rules = blueprint.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(1);
        const rule = rules[0];
        expect(rule.id).toBe("sys_draft_tier_1_pool_0");
        expect(rule.sortKey).toBe("sys_070");
        expect(rule.actions[0]).toMatchObject({
            type: "TRIGGER_DRAFT",
            poolId: "tier_1_pool",
            count: 3,
            triggerEntityId: "self",
        });
    });

    it("does not mutate blueprint and warns when poolId is empty", () => {
        // Given
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(blueprint, { poolId: "", count: 3, conditions: [] }, 0);

        // Then
        expect(blueprint.components.behavior).toBeUndefined();
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("missing poolId"),
        );
    });

    it("emits the rule but warns when blueprint has no cycle", () => {
        // Given
        const blueprint = createBlueprint("bp_no_cycle", { components: {} });

        // When
        draftCompiler(blueprint, validConfig, 0);

        // Then
        const rules = blueprint.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(1);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("requires cycle"),
        );
    });

    it("indexes the rule id by the provided index", () => {
        // Given
        const blueprint = makeCycleBlueprint();

        // When
        draftCompiler(blueprint, validConfig, 2);

        // Then
        expect(blueprint.components.behavior?.rules?.[0].id).toBe(
            "sys_draft_tier_1_pool_2",
        );
    });
});
