import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { upkeepCompiler } from "./upkeepCompiler";
import type { BehaviorRule } from "../../../data/schemas/behavior";

const makeDraft = () =>
    createBlueprint("heater", {
        components: { state: { fuel: { value: 5, max: 10, visible: false } } },
    });

const findRequestRule = (draft: ReturnType<typeof makeDraft>) =>
    draft.components.behavior?.rules?.find(
        (r: BehaviorRule) => r.id === "sys_upkeep_request_fuel_0",
    );

describe("upkeepCompiler requestSource", () => {
    it("uses requestSource when provided", () => {
        const draft = makeDraft();
        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: true,
                requestSource: "sys_world",
            },
            0,
        );

        const rule = findRequestRule(draft);
        expect(rule).toBeDefined();
        expect(rule!.actions[0]).toMatchObject({
            type: "TRANSFER",
            source: "sys_world",
            target: "self",
            resource: "fuel",
        });
    });

    it("falls back to tag:storage when requestSource is absent", () => {
        const draft = makeDraft();
        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: true,
            },
            0,
        );

        const rule = findRequestRule(draft);
        expect(rule!.actions[0]).toMatchObject({
            source: "tag:storage:fuel",
        });
    });
});
