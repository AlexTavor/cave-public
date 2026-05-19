import { describe, it, expect } from "vitest";
import { updaterCompiler } from "./updaterCompiler";
import { createBlueprint } from "../../test/factories";

const makeCycleBlueprint = (id = "bp_entity") =>
    createBlueprint(id, {
        components: {
            state: { cycle: { value: 0, max: 100, visible: true } },
        },
    });

const validConfig = {
    target: "sys_world.state.purge_progress.value",
    op: "ADD" as const,
    value: 1,
    conditions: [],
};

describe("updaterCompiler", () => {
    it("emits a MUTATE rule with cycle-complete conditions", () => {
        // Given
        const blueprint = makeCycleBlueprint();

        // When
        updaterCompiler(blueprint, validConfig, 0);

        // Then
        const rules = blueprint.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(1);
        const rule = rules[0];
        expect(rule.id).toBe("sys_updater_0");
        expect(rule.sortKey).toBe("45_updater_0");
        expect(rule.conditions.length).toBeGreaterThanOrEqual(2);
        expect(rule.actions[0]).toMatchObject({
            type: "MUTATE",
            target: "sys_world.state.purge_progress.value",
            op: "ADD",
            value: 1,
        });
    });

    it("does not throw for empty target or zero value", () => {
        // Given
        const blueprint = makeCycleBlueprint();
        const config = {
            target: "",
            op: "SET" as const,
            value: 0,
            conditions: [],
        };

        // When / Then
        expect(() => updaterCompiler(blueprint, config, 0)).not.toThrow();
        const rules = blueprint.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(1);
        expect(rules[0].actions[0]).toMatchObject({
            type: "MUTATE",
            target: "",
            op: "SET",
            value: 0,
        });
    });

    it("appends custom conditions alongside cycle conditions", () => {
        // Given
        const blueprint = makeCycleBlueprint();
        const config = {
            ...validConfig,
            conditions: ["self.state.purge_progress.value < 10"],
        };

        // When
        updaterCompiler(blueprint, config, 1);

        // Then
        const rules = blueprint.components.behavior?.rules ?? [];
        const rule = rules[0];
        expect(rule.conditions.length).toBeGreaterThan(2);
    });

    it("indexes the rule id by the provided index", () => {
        // Given
        const blueprint = makeCycleBlueprint();

        // When
        updaterCompiler(blueprint, validConfig, 3);

        // Then
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.id).toBe("sys_updater_3");
        expect(rule?.sortKey).toBe("45_updater_3");
    });

    it("accepts a string logic reference as value", () => {
        // Given
        const blueprint = makeCycleBlueprint();
        const config = {
            ...validConfig,
            value: "self.state.power.value",
        };

        // When
        updaterCompiler(blueprint, config, 0);

        // Then
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.actions[0]).toMatchObject({
            type: "MUTATE",
            value: "self.state.power.value",
        });
    });
});
