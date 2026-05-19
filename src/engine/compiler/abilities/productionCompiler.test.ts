import { describe, it, expect } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";

const SV = (base: number) => ({ base, perBody: 0, multPerBody: 0 });

const makeProductionBp = (
    id: string,
    resource: string,
    target: string,
    amount = 1,
) =>
    createBlueprint(id, {
        components: {},
        _editor: {
            abilities: {
                cycle: {
                    maxProgress: SV(5),
                    costMultPerCycle: 0,
                    inputs: { body: SV(1) },
                    oneOff: false,
                    conditions: [],
                },
                production: [
                    { resource, target, amount: SV(amount), conditions: [] },
                ],
            },
        },
    });

const findProdRule = (
    compiled: ReturnType<CompilerService["compile"]>,
    r: string,
) =>
    (compiled.components.behavior?.rules ?? []).find(
        (rule) => rule.id === `sys_produce_${r}_0`,
    );

describe("productionCompiler", () => {
    it("emits MUTATE for self-targeted production", () => {
        const compiled = new CompilerService().compile(
            makeProductionBp("bp_egg", "wood", "self"),
        );
        const rule = findProdRule(compiled, "wood");

        expect(rule?.actions).toHaveLength(1);
        expect(rule?.actions[0]).toMatchObject({
            type: "MUTATE",
            target: "self.state.wood.value",
            op: "ADD",
        });
    });

    it("emits MUTATE then TRANSFER for external production", () => {
        const compiled = new CompilerService().compile(
            makeProductionBp("bp_mine", "stone", "tag:storage:stone", 2),
        );
        const rule = findProdRule(compiled, "stone");

        expect(rule?.actions).toHaveLength(2);
        expect(rule?.actions[0]).toMatchObject({
            type: "MUTATE",
            target: "self.state.stone.value",
            op: "ADD",
        });
        expect(rule?.actions[1]).toMatchObject({
            type: "TRANSFER",
            source: "self",
            target: "tag:storage:stone",
            resource: "stone",
        });
    });

    it("falls back to tag:storage when target is empty string", () => {
        const compiled = new CompilerService().compile(
            makeProductionBp("bp_forage", "food", ""),
        );
        const rule = findProdRule(compiled, "food");

        expect(rule?.actions[1]).toMatchObject({
            type: "TRANSFER",
            target: "tag:storage:food",
        });
    });

    it("initializes resource buffer state for external production", () => {
        const compiled = new CompilerService().compile(
            makeProductionBp("bp_forage2", "food", ""),
        );
        const state = compiled.components.state as Record<string, unknown>;

        expect(state.food).toEqual({ value: 0, visible: false });
    });
});
