import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const makeStorage = (resource: string) => ({
    resource,
    capacity: { base: 0, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
});

const makeCycleBlueprint = (
    id: string,
    cycle: Record<string, unknown>,
    extras?: Record<string, unknown>,
) =>
    createBlueprint(id, {
        components: {},
        _editor: { abilities: { cycle, ...extras } as any },
    });

const compile = (bp: ReturnType<typeof createBlueprint>) =>
    new CompilerService().compile(bp);

const findRule = (rules: any[], id: string) =>
    rules.find((r: any) => r.id === id);

describe("cycleCompiler", () => {
    it("adds a cycle transition rule when transformTo is set", () => {
        const bp = makeCycleBlueprint("bp_site", {
            maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
            inputs: {},
            transformTo: "bp_house",
            oneOff: false,
            conditions: [],
        });
        const rules = compile(bp).components.behavior?.rules ?? [];
        const transition = findRule(rules, "sys_cycle_transition");

        expect(transition?.actions[0]).toEqual({
            type: "PATCH_BLUEPRINT",
            blueprintId: "bp_house",
            components: {},
        });
    });

    it("compiles one-off cycles with depletion and GC rules", () => {
        const bp = makeCycleBlueprint(
            "bp_loot",
            {
                maxProgress: { base: 5, perBody: 0, multPerBody: 0 },
                inputs: { body: { base: 1, perBody: 0, multPerBody: 0 } },
                oneOff: true,
                conditions: [],
            },
            { storage: [makeStorage("wood"), makeStorage("stone")] },
        );
        const compiled = compile(bp);
        const state = compiled.components.state as any;
        const rules = compiled.components.behavior?.rules ?? [];
        const resetRule = findRule(rules, "sys_cycle_reset");
        const gcRule = findRule(rules, "sys_cycle_gc");
        const accumulate = findRule(rules, "sys_cycle_accumulate");

        expect(state?.is_depleted?.value).toBe(0);
        expect(
            resetRule?.actions.some(
                (a: any) =>
                    a.type === "MUTATE" &&
                    a.target === "self.state.is_depleted.value" &&
                    a.value === 1,
            ),
        ).toBe(true);
        expect(gcRule?.actions[0]).toEqual({ type: "KILL", entityId: "self" });
        expect(
            gcRule?.conditions.some((c: any) =>
                c.tokens.some(
                    (t: any) =>
                        t.t === "ref" && t.v === "self.state.wood.value",
                ),
            ),
        ).toBe(true);
        expect(
            accumulate?.conditions.some((c: any) =>
                c.tokens.some(
                    (t: any) =>
                        t.t === "ref" && t.v === "self.state.is_depleted.value",
                ),
            ),
        ).toBe(true);
    });

    it("does not emit retired attention state", () => {
        const compiled = compile(
            makeCycleBlueprint("bp_cycle", {
                maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
                inputs: {},
                oneOff: false,
                conditions: [],
            }),
        );

        expect(compiled.components.state).not.toHaveProperty(
            "attention_until_connected",
        );
    });
});

