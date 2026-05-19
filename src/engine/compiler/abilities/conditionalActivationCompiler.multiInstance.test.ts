import { describe, expect, it, vi } from "vitest";
import { createBlueprint } from "../../test/factories";
import { CompilerService } from "../CompilerService";
import { getConditionalActivationActiveStateKey } from "../../runtime/conditionalActivationState";
import { validateConditionalActivationTargets } from "./conditionalActivationCompiler";

const condition = {
    kind: "world_state_threshold" as const,
    key: "food",
    operator: ">=" as const,
    value: 1,
};

describe("conditionalActivationCompiler multi-instance", () => {
    it("compiles one hidden state and rule pair per conditioned entry", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("bp", {
                components: {},
                _editor: {
                    abilities: {
                        production: [
                            {
                                id: "prod-1",
                                resource: "wood",
                                amount: { base: 1, perBody: 0, multPerBody: 0 },
                                conditions: [],
                            },
                        ],
                        conditionalActivation: [
                            { conditions: [condition], targets: [] },
                            { conditions: [condition], targets: [] },
                        ],
                    },
                },
            }),
        );
        const rules = compiled.components.behavior?.rules ?? [];
        expect(
            compiled.components.state?.[
                getConditionalActivationActiveStateKey(0)
            ],
        ).toEqual({ value: 0, visible: false });
        expect(
            compiled.components.state?.[
                getConditionalActivationActiveStateKey(1)
            ],
        ).toEqual({ value: 0, visible: false });
        expect(
            rules.some((rule) => rule.id === "sys_conditional_activation_on"),
        ).toBe(true);
        expect(
            rules.some((rule) => rule.id === "sys_conditional_activation_off"),
        ).toBe(true);
        expect(
            rules.some((rule) => rule.id === "sys_conditional_activation_on_1"),
        ).toBe(true);
        expect(
            rules.some(
                (rule) => rule.id === "sys_conditional_activation_off_1",
            ),
        ).toBe(true);
    });

    it("includes the authored index in stale-target warnings", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        validateConditionalActivationTargets("bp", {
            production: [
                {
                    id: "prod-1",
                    resource: "wood",
                    amount: { base: 1, perBody: 0, multPerBody: 0 },
                    conditions: [],
                },
            ],
            conditionalActivation: [
                { targets: [{ ability: "storage" }] },
                { targets: [{ ability: "production", targetId: "missing" }] },
            ],
        } as any);
        expect(warn.mock.calls[0]?.[0]).toContain("[0]");
        expect(warn.mock.calls[1]?.[0]).toContain("[1]");
        warn.mockRestore();
    });
});
