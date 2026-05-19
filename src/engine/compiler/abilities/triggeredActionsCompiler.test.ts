import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triggeredActionsCompiler } from "./triggeredActionsCompiler";
import { createBlueprint } from "../../test/factories";
import { getConditionalActivationActiveStateKey } from "../../runtime/conditionalActivationState";
import type { TriggeredActionsAbilityConfig } from "../../../data/schemas/abilities/triggeredActions";

const config: TriggeredActionsAbilityConfig = {
    id: "ta-1",
    triggers: ["assignment_complete"],
    conditions: ["self.state.ready.value == 1"],
    actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 2 }],
};

describe("triggeredActionsCompiler", () => {
    beforeEach(() => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });
    afterEach(() => vi.restoreAllMocks());

    it("compiles one rule per entry and preserves authored actions", () => {
        const blueprint = createBlueprint("bp", { components: {} });
        triggeredActionsCompiler(blueprint, config, 0);
        const rule = blueprint.components.behavior?.rules?.[0];
        expect(rule?.id).toBe("sys_triggered_actions_ta-1");
        expect(rule?.conditions[0]?.compiled).toEqual({
            ">": [{ var: "self.state.assignment_complete_pulse.value" }, 0],
        });
        expect(rule?.conditions[1]?.tokens).toEqual([
            { t: "ref", v: "self.state.ready.value" },
            { t: "op", v: "==" },
            { t: "val", v: 1 },
        ]);
        expect(rule?.actions).toEqual(config.actions);
    });

    it("appends conditional activation state only when selected", () => {
        const blueprint = createBlueprint("bp", { components: {} });
        triggeredActionsCompiler(blueprint, config, 0, {
            conditions: [],
            targets: [{ ability: "triggeredActions", targetId: "ta-1" }],
        });
        expect(
            blueprint.components.behavior?.rules?.[0]?.conditions,
        ).toContainEqual(
            expect.objectContaining({
                compiled: {
                    var: `self.state.${getConditionalActivationActiveStateKey(0)}.value`,
                },
            }),
        );
    });

    it("appends one active-state ref per matching conditional activation", () => {
        const blueprint = createBlueprint("bp", { components: {} });
        triggeredActionsCompiler(blueprint, config, 0, [
            {
                conditions: [],
                targets: [{ ability: "triggeredActions", targetId: "ta-1" }],
            },
            {
                conditions: [],
                targets: [{ ability: "triggeredActions", targetId: "ta-1" }],
            },
        ]);
        expect(
            blueprint.components.behavior?.rules?.[0]?.conditions
                .map((entry) => entry.compiled)
                .filter(
                    (entry) =>
                        typeof entry === "object" &&
                        entry !== null &&
                        "var" in entry,
                ),
        ).toEqual([
            {
                var: `self.state.${getConditionalActivationActiveStateKey(0)}.value`,
            },
            {
                var: `self.state.${getConditionalActivationActiveStateKey(1)}.value`,
            },
        ]);
    });

    it("warns when cycle_complete is used without cycle state", () => {
        const blueprint = createBlueprint("bp", { components: {} });
        triggeredActionsCompiler(
            blueprint,
            { ...config, triggers: ["cycle_complete"] },
            0,
        );
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining("requires cycle"),
        );
    });
});
