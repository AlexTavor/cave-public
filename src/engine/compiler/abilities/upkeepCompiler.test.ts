import { describe, expect, it, vi } from "vitest";
import { createBlueprint } from "../../test/factories";
import { upkeepCompiler } from "./upkeepCompiler";
import { Op } from "../../../data/schemas/primitives";

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

    it("builds the exact passiveEffects (rate SET, demand SET, demand MULT dt_s)", () => {
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

        expect(draft.components.passiveEffects).toEqual([
            {
                op: Op.SET,
                target: "self.state.vals_upkeep_rate_fuel_0.value",
                value: 2,
            },
            {
                op: Op.SET,
                target: "self.state.upkeep_fuel_demand_0.value",
                source: "self.state.vals_upkeep_rate_fuel_0.value",
            },
            {
                op: Op.MULT,
                target: "self.state.upkeep_fuel_demand_0.value",
                source: "global.dt_s",
            },
        ]);
    });

    it("builds the exact behavior rules (consume + trait-on + trait-off) without autoRequest", () => {
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

        expect(draft.components.behavior?.rules).toEqual([
            {
                id: "sys_upkeep_consume_fuel_0",
                sortKey: "sys_060",
                conditions: [],
                actions: [
                    {
                        type: "MUTATE",
                        target: "self.state.fuel.value",
                        op: "SUB",
                        value: "self.state.upkeep_fuel_demand_0.value",
                    },
                ],
            },
            {
                id: "sys_upkeep_trait_on_fuel_0",
                sortKey: "sys_061",
                conditions: [
                    {
                        id: "resource_check",
                        sortKey: "0",
                        tokens: [
                            { t: "ref", v: "self.state.fuel.value" },
                            { t: "op", v: "<=" },
                            { t: "val", v: 0 },
                        ],
                    },
                ],
                actions: [{ type: "ADD_TRAIT", traitId: "is_cold" }],
            },
            {
                id: "sys_upkeep_trait_off_fuel_0",
                sortKey: "sys_061",
                conditions: [
                    {
                        id: "resource_check",
                        sortKey: "0",
                        tokens: [
                            { t: "ref", v: "self.state.fuel.value" },
                            { t: "op", v: ">" },
                            { t: "val", v: 0 },
                        ],
                    },
                ],
                actions: [{ type: "REMOVE_TRAIT", traitId: "is_cold" }],
            },
        ]);
    });

    it("appends the full request rule as a 4th rule when autoRequest is true", () => {
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

        const rules = draft.components.behavior?.rules ?? [];
        expect(rules).toHaveLength(4);
        expect(rules[3]).toEqual({
            id: "sys_upkeep_request_fuel_0",
            sortKey: "sys_062",
            conditions: [
                {
                    id: "resource_not_full",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.fuel.value" },
                        { t: "op", v: "<" },
                        { t: "ref", v: "self.state.fuel.max" },
                    ],
                },
            ],
            actions: [
                {
                    type: "TRANSFER",
                    source: "tag:storage:fuel",
                    target: "self",
                    resource: "fuel",
                    amount: "self.state.fuel.max",
                },
            ],
        });
    });

    it("uses the index in the rate/demand state keys and rule ids", () => {
        const draft = createBlueprint("heater", {
            components: { state: { fuel: { value: 5, max: 10, visible: false } } },
        });

        upkeepCompiler(
            draft,
            {
                resource: "fuel",
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
            },
            5,
        );

        const stateKeys = Object.keys(draft.components.state ?? {});
        expect(stateKeys).toContain("vals_upkeep_rate_fuel_5");
        expect(stateKeys).toContain("upkeep_fuel_demand_5");
        expect(stateKeys).not.toContain("vals_upkeep_rate_fuel_0");

        const ids = draft.components.behavior?.rules?.map((r) => r.id);
        expect(ids).toEqual([
            "sys_upkeep_consume_fuel_5",
            "sys_upkeep_trait_on_fuel_5",
            "sys_upkeep_trait_off_fuel_5",
        ]);
    });

    it("warns and makes no changes when the resource is blank/whitespace", () => {
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        upkeepCompiler(
            draft,
            {
                resource: "   ",
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Upkeep ability missing resource on 'heater'.",
        );
        // Early return: no passiveEffects, behavior, or tags were added.
        expect(draft.components.passiveEffects).toBeUndefined();
        expect(draft.components.behavior).toBeUndefined();
        expect(draft.tags).toEqual([]);
        warn.mockRestore();
    });

    it("warns and makes no changes when the resource is missing (undefined)", () => {
        const draft = makeDraft();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        upkeepCompiler(
            draft,
            {
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
            } as never,
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Upkeep ability missing resource on 'heater'.",
        );
        expect(draft.components.behavior).toBeUndefined();
        warn.mockRestore();
    });

    it("trims surrounding whitespace from the resource before use", () => {
        const draft = createBlueprint("heater", {
            components: { state: {} },
        });

        upkeepCompiler(
            draft,
            {
                resource: "  fuel  ",
                rate: { base: 1, perBody: 0, multPerBody: 0 },
                failureTrait: "is_cold",
                autoRequest: false,
            },
            0,
        );

        // The trimmed "fuel" is used for state keys and the consume rule.
        expect(draft.components.state?.fuel).toBeDefined();
        expect(draft.components.state?.["  fuel  "]).toBeUndefined();
        expect(draft.components.behavior?.rules?.[0]?.id).toBe(
            "sys_upkeep_consume_fuel_0",
        );
    });

    it("initializes a missing rules array on an existing behavior component", () => {
        const draft = createBlueprint("heater", {
            components: {
                state: { fuel: { value: 5, visible: false } },
                // behavior exists but has no rules array yet (rules ??= []).
                behavior: {},
            },
        });

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

        const ids = draft.components.behavior?.rules?.map((r) => r.id);
        expect(ids).toEqual([
            "sys_upkeep_consume_fuel_0",
            "sys_upkeep_trait_on_fuel_0",
            "sys_upkeep_trait_off_fuel_0",
        ]);
    });

    it("initializes a missing tags array before adding the susceptible tag", () => {
        const draft = createBlueprint("heater", {
            tags: undefined,
            components: { state: { fuel: { value: 5, visible: false } } },
        });

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

        expect(draft.tags).toEqual(["susceptible_to_is_cold"]);
    });

    it("does not duplicate the susceptible tag when it is already present", () => {
        const draft = createBlueprint("heater", {
            tags: ["susceptible_to_is_cold"],
            components: { state: { fuel: { value: 5, visible: false } } },
        });

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

        expect(
            draft.tags.filter((t) => t === "susceptible_to_is_cold"),
        ).toHaveLength(1);
    });
});

