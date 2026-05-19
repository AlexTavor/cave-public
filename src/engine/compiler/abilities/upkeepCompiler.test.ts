import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { upkeepCompiler } from "./upkeepCompiler";

const makeDraft = () =>
    createBlueprint("heater", {
        components: {
            state: {
                fuel: { value: 5, max: 10, visible: false },
            },
        },
    });

describe("upkeepCompiler", () => {
    it("adds demand passive effects", () => {
        const draft = makeDraft();

        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 2, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
            },
            0,
        );

        const effects = draft.components.passiveEffects ?? [];
        const hasDemandSet = effects.some(
            (effect) =>
                effect.op === "SET" &&
                effect.target === "self.state.upkeep_fuel_demand_0.value",
        );
        const hasDemandMult = effects.some(
            (effect) => effect.op === "MULT" && effect.source === "global.dt_s",
        );
        expect(hasDemandSet).toBe(true);
        expect(hasDemandMult).toBe(true);
    });

    it("emits ADD_TRAIT and REMOVE_TRAIT rules", () => {
        const draft = makeDraft();

        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
            },
            0,
        );

        const addRule = draft.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_upkeep_trait_on_fuel_0",
        );
        expect(addRule?.actions?.[0]).toMatchObject({
            type: "ADD_TRAIT",
            traitId: "is_cold",
        });

        const removeRule = draft.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_upkeep_trait_off_fuel_0",
        );
        expect(removeRule?.actions?.[0]).toMatchObject({
            type: "REMOVE_TRAIT",
            traitId: "is_cold",
        });
    });

    it("does not create flag state keys", () => {
        const draft = makeDraft();

        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
            },
            0,
        );

        const stateKeys = Object.keys(draft.components.state ?? {});
        expect(stateKeys.some((k) => k.startsWith("flag_"))).toBe(false);
    });

    it("uses failureTrait for susceptible tag", () => {
        const draft = makeDraft();

        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
            },
            0,
        );

        expect(draft.tags).toContain("susceptible_to_is_cold");
    });

    it("when autoRequest is enabled, requests when not full (value < max)", () => {
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

        const requestRule = draft.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_upkeep_request_fuel_0",
        );
        expect(requestRule).toBeTruthy();

        const cond = requestRule?.conditions?.find(
            (c) => c.id === "resource_not_full",
        );
        expect(cond).toBeTruthy();

        expect(cond?.tokens).toEqual([
            { t: "ref", v: "self.state.fuel.value" },
            { t: "op", v: "<" },
            { t: "ref", v: "self.state.fuel.max" },
        ]);

        expect(requestRule?.actions?.[0]).toMatchObject({
            type: "TRANSFER",
            source: "tag:storage:fuel",
            target: "self",
            resource: "fuel",
            amount: "self.state.fuel.max",
        });
    });
});

