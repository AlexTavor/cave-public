import { describe, expect, it, vi } from "vitest";
import type { ConditionalActivationAbilityConfig } from "../../../data/schemas/abilities/conditionalActivation";
import {
    isConditionalActivationSelected,
    validateConditionalActivationTargets,
} from "./conditionalActivationCompiler";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import { CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY } from "../../runtime/conditionalActivationState";

const structuredConditions: NonNullable<
    ConditionalActivationAbilityConfig["conditions"]
> = [
    { kind: "world_state_threshold", key: "food", operator: ">=", value: 1 },
    {
        kind: "fact_threshold",
        scope: "run",
        factType: "elapsed_real_seconds",
        factAbout: "world",
        operator: ">",
        value: 3,
    },
];

describe("conditionalActivationCompiler", () => {
    it("resolves singleton and array target selection", () => {
        const config: ConditionalActivationAbilityConfig = {
            conditions: structuredConditions,
            targets: [
                { ability: "cycle" as const },
                { ability: "production" as const, targetId: "prod-1" },
            ],
        };
        expect(
            isConditionalActivationSelected(config, { ability: "cycle" }),
        ).toBe(true);
        expect(
            isConditionalActivationSelected(config, {
                ability: "production",
                targetId: "prod-1",
            }),
        ).toBe(true);
        expect(
            isConditionalActivationSelected(config, {
                ability: "production",
                targetId: "missing",
            }),
        ).toBe(false);
    });

    it("emits the hidden active state and aggregated on/off gates", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("bp", {
                components: {},
                _editor: {
                    abilities: {
                        conditionalActivation: {
                            conditions: structuredConditions,
                            targets: [],
                        },
                    },
                },
            }),
        );
        const rules = compiled.components.behavior?.rules ?? [];
        expect(
            compiled.components.state?.[
                CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY
            ],
        ).toEqual({ value: 0, visible: false });
        expect(
            rules.find((rule) => rule.id === "sys_conditional_activation_on")
                ?.conditions[0]?.compiled,
        ).toEqual({
            and: [
                { ">=": [{ var: "sys_world.state.food.value" }, 1] },
                {
                    ">": [
                        { var: "sys_world.run.elapsed_real_seconds.world" },
                        3,
                    ],
                },
            ],
        });
        expect(
            rules.find((rule) => rule.id === "sys_conditional_activation_off")
                ?.conditions[0]?.compiled,
        ).toEqual({
            "!": [
                {
                    and: [
                        { ">=": [{ var: "sys_world.state.food.value" }, 1] },
                        {
                            ">": [
                                {
                                    var: "sys_world.run.elapsed_real_seconds.world",
                                },
                                3,
                            ],
                        },
                    ],
                },
            ],
        });
    });

    it("warns on stale and unsupported targets", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        validateConditionalActivationTargets("bp", {
            cycle: {
                maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
                inputs: {},
                oneOff: false,
                conditions: [],
            },
            conditionalActivation: {
                conditions: structuredConditions,
                targets: [
                    { ability: "storage" },
                    { ability: "production", targetId: "missing" },
                ],
            },
            production: [
                {
                    id: "prod-1",
                    resource: "wood",
                    amount: { base: 1, perBody: 0, multPerBody: 0 },
                    conditions: [],
                },
            ],
        } as any);
        expect(warn).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });
});
