import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { upkeepCompiler } from "./upkeepCompiler";
import type { BehaviorRule } from "../../../data/schemas/behavior";

const makeDraft = () =>
    createBlueprint("heater", {
        components: { state: { fuel: { value: 5, visible: false } } },
    });

const findRequestRule = (draft: ReturnType<typeof makeDraft>) =>
    draft.components.behavior?.rules?.find(
        (r: BehaviorRule) => r.id === "sys_upkeep_request_fuel_0",
    );

describe("upkeepCompiler isImmediate", () => {
    it("emits isImmediate when enabled", () => {
        const draft = makeDraft();

        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 2, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: true,
                isImmediate: true,
            },
            0,
        );

        const rule = findRequestRule(draft);
        expect(rule).toBeDefined();
        expect((rule?.actions?.[0] as any)?.isImmediate).toBe(true);
    });

    it("omits isImmediate when disabled", () => {
        const draft = makeDraft();

        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 2, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: true,
            },
            0,
        );

        const rule = findRequestRule(draft);
        expect(rule).toBeDefined();
        expect((rule?.actions?.[0] as any)?.isImmediate).toBeUndefined();
    });

    it("autoRequest false emits no request rule even with isImmediate", () => {
        const draft = makeDraft();

        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 2, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
                isImmediate: true,
            },
            0,
        );

        expect(findRequestRule(draft)).toBeUndefined();
    });
});
