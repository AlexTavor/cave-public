import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { assignmentCompiler } from "./assignmentCompiler";

const compile = (config: Record<string, unknown>, storage?: unknown[]) => {
    const draft = createBlueprint("station", { components: {} });
    assignmentCompiler(
        draft,
        {
            slots: 1,
            locking: false,
            filter: [],
            minimums: [],
            duration: 0,
            ...config,
        } as any,
        { storage } as any,
    );
    return draft;
};

describe("assignmentCompiler one-off", () => {
    it("compiles one-off assignments with is_depleted state", () => {
        const draft = compile({ oneOff: true });
        expect(draft.components.state?.is_depleted).toEqual({
            value: 0,
            visible: false,
        });
    });

    it("reuses the cycle GC rule when one-off is enabled", () => {
        const draft = compile({ oneOff: true }, [
            {
                resource: "food",
                capacity: { base: 1, perBody: 0, multPerBody: 0 },
                entropy: { base: 0, perBody: 0, multPerBody: 0 },
                isDefault: true,
                visible: true,
                allowDeposit: false,
                allowWithdraw: true,
                priority: 0,
            },
        ]);
        expect(
            draft.components.behavior?.rules?.find(
                (rule) => rule.id === "sys_cycle_gc",
            ),
        ).toBeDefined();
    });
});
