import { describe, expect, it, vi } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { samplerCompiler } from "./samplerCompiler";

// These tests call the pure samplerCompiler directly (no CompilerService) and
// assert the FULL emitted structure with deep equality, so any mutation along
// the state/rule construction path (ids, sortKeys, op/target strings, default
// literals, branch flips) changes an asserted value and is killed.

const withCycle = () =>
    createBlueprint("sampler_bp", {
        components: {
            state: { cycle: { value: 0, max: 10, visible: false } },
        },
    });

const findSamplerRule = (draft: Blueprint, id: string) =>
    draft.components.behavior?.rules?.find((entry) => entry.id === id);

describe("samplerCompiler (direct build)", () => {
    it("builds the full sampled-state entry and rule for a `.value` source (with .max sync)", () => {
        const draft = withCycle();

        samplerCompiler(
            draft,
            {
                source: "sys_world.state.notoriety.value",
                target: "sampled_value",
                visible: true,
                max: 100,
            },
            0,
        );

        // Derived target key wins over config.target -> "sampled_notoriety".
        expect(draft.components.state?.sampled_notoriety).toEqual({
            value: 0,
            visible: true,
            max: 100,
        });

        // Full rule: id uses derived target + index, fixed sortKey, default
        // cycle_complete trigger conditions, and BOTH MUTATE actions because the
        // source ends in `.value` (maxSource present).
        expect(findSamplerRule(draft, "sys_sampler_sampled_notoriety_0")).toEqual({
            id: "sys_sampler_sampled_notoriety_0",
            sortKey: "sys_075",
            conditions: [
                {
                    id: "cycle_complete",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.value" },
                        { t: "op", v: ">=" },
                        { t: "ref", v: "self.state.cycle.max" },
                    ],
                },
                {
                    id: "cycle_has_max",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.max" },
                        { t: "op", v: ">" },
                        { t: "val", v: 0 },
                    ],
                },
            ],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.sampled_notoriety.value",
                    op: "SET",
                    value: "sys_world.state.notoriety.value",
                },
                {
                    type: "MUTATE",
                    target: "self.state.sampled_notoriety.max",
                    op: "SET",
                    value: "sys_world.state.notoriety.max",
                },
            ],
        });
    });

    it("omits the .max MUTATE action when the source is not a `.value` path", () => {
        const draft = withCycle();

        samplerCompiler(
            draft,
            {
                source: "global.heat",
                target: "sampled_value",
                visible: false,
                max: 50,
            },
            2,
        );

        // candidate is the last path segment "heat" -> "sampled_heat".
        expect(draft.components.state?.sampled_heat).toEqual({
            value: 0,
            visible: false,
            max: 50,
        });

        // index 2 is interpolated into the id; only the single value MUTATE.
        expect(findSamplerRule(draft, "sys_sampler_sampled_heat_2")).toEqual({
            id: "sys_sampler_sampled_heat_2",
            sortKey: "sys_075",
            conditions: [
                {
                    id: "cycle_complete",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.value" },
                        { t: "op", v: ">=" },
                        { t: "ref", v: "self.state.cycle.max" },
                    ],
                },
                {
                    id: "cycle_has_max",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.max" },
                        { t: "op", v: ">" },
                        { t: "val", v: 0 },
                    ],
                },
            ],
            actions: [
                {
                    type: "MUTATE",
                    target: "self.state.sampled_heat.value",
                    op: "SET",
                    value: "global.heat",
                },
            ],
        });
    });

    it("defaults visible to true and max to 100 when both are omitted", () => {
        const draft = withCycle();

        samplerCompiler(
            draft,
            {
                source: "global.heat",
                target: "sampled_value",
            } as never,
            0,
        );

        // config.visible ?? true  and  config.max ?? 100 — exact defaults.
        expect(draft.components.state?.sampled_heat).toEqual({
            value: 0,
            visible: true,
            max: 100,
        });
    });

    it("keeps visible:false and max:0 when explicitly provided (defaults are not forced)", () => {
        const draft = withCycle();

        samplerCompiler(
            draft,
            {
                source: "global.heat",
                target: "sampled_value",
                visible: false,
                max: 0,
            },
            0,
        );

        // 0 and false must survive the ?? defaults (not become 100 / true).
        expect(draft.components.state?.sampled_heat).toEqual({
            value: 0,
            visible: false,
            max: 0,
        });
    });

    it("trims the source before deriving the target and the SET value", () => {
        const draft = withCycle();

        samplerCompiler(
            draft,
            {
                source: "  sys_world.state.notoriety.value  ",
                target: "sampled_value",
                visible: true,
                max: 100,
            },
            0,
        );

        const rule = findSamplerRule(draft, "sys_sampler_sampled_notoriety_0");
        // trimmed source flows into both the value SET and the derived max SET.
        expect(rule?.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.sampled_notoriety.value",
                op: "SET",
                value: "sys_world.state.notoriety.value",
            },
            {
                type: "MUTATE",
                target: "self.state.sampled_notoriety.max",
                op: "SET",
                value: "sys_world.state.notoriety.max",
            },
        ]);
    });

    it("falls back to config.target when the source has no derivable segment", () => {
        const draft = withCycle();

        // A bare "value" source: deriveSamplerTargetKey returns null (candidate
        // collapses to empty), so config.target is used and trimmed.
        samplerCompiler(
            draft,
            {
                source: "value",
                target: "  manual_target  ",
                visible: true,
                max: 7,
            },
            1,
        );

        expect(draft.components.state?.manual_target).toEqual({
            value: 0,
            visible: true,
            max: 7,
        });
        // source "value" does not end with ".value" -> no max sync action.
        expect(findSamplerRule(draft, "sys_sampler_manual_target_1")?.actions).toEqual([
            {
                type: "MUTATE",
                target: "self.state.manual_target.value",
                op: "SET",
                value: "value",
            },
        ]);
    });

    it("warns and emits nothing when the source is missing", () => {
        const draft = withCycle();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        samplerCompiler(
            draft,
            { target: "sampled_value", visible: true, max: 100 } as never,
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Sampler ability missing source on 'sampler_bp'.",
        );
        // Early return: no behavior rules were added.
        expect(draft.components.behavior).toBeUndefined();
        warn.mockRestore();
    });

    it("warns and emits nothing when the source is only whitespace", () => {
        const draft = withCycle();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        samplerCompiler(
            draft,
            { source: "   ", target: "sampled_value", visible: true, max: 100 },
            0,
        );

        // trim() yields "" -> the !source guard fires.
        expect(warn).toHaveBeenCalledWith(
            "Sampler ability missing source on 'sampler_bp'.",
        );
        expect(draft.components.behavior).toBeUndefined();
        warn.mockRestore();
    });

    it("warns about a missing cycle when a cycle trigger is required (default triggers)", () => {
        const draft = createBlueprint("nocycle", { components: { state: {} } });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        // triggers omitted -> defaults to ["cycle_complete"] -> requires cycle,
        // but state.cycle is absent.
        samplerCompiler(
            draft,
            {
                source: "sys_world.state.notoriety.value",
                target: "sampled_value",
                visible: true,
                max: 100,
            },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Sampler ability requires cycle on 'nocycle'.",
        );
        // The warning does NOT early-return: the rule is still emitted.
        expect(
            findSamplerRule(draft, "sys_sampler_sampled_notoriety_0"),
        ).toBeDefined();
        warn.mockRestore();
    });

    it("does NOT warn about a missing cycle when the trigger is assignment-only", () => {
        const draft = createBlueprint("nocycle", { components: { state: {} } });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        samplerCompiler(
            draft,
            {
                source: "sys_world.state.notoriety.value",
                target: "sampled_value",
                visible: true,
                max: 100,
                triggers: ["assignment_complete"],
            },
            0,
        );

        expect(warn).not.toHaveBeenCalledWith(
            "Sampler ability requires cycle on 'nocycle'.",
        );

        // assignment-only trigger -> the assignment_complete condition, not the
        // cycle conditions.
        expect(
            findSamplerRule(draft, "sys_sampler_sampled_notoriety_0")?.conditions,
        ).toEqual([
            {
                id: "assignment_complete",
                sortKey: "0",
                tokens: [],
                compiled: {
                    ">": [
                        { var: "self.state.assignment_complete_pulse.value" },
                        0,
                    ],
                },
            },
        ]);
        warn.mockRestore();
    });

    it("does NOT warn when a cycle trigger is required and the cycle is present", () => {
        const draft = withCycle();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        samplerCompiler(
            draft,
            {
                source: "sys_world.state.notoriety.value",
                target: "sampled_value",
                visible: true,
                max: 100,
                triggers: ["cycle_complete"],
            },
            0,
        );

        expect(warn).not.toHaveBeenCalledWith(
            "Sampler ability requires cycle on 'sampler_bp'.",
        );
        warn.mockRestore();
    });

    it("warns and emits nothing when neither a derivable source nor config.target yields a target", () => {
        const draft = withCycle();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        // source "value" -> deriveSamplerTargetKey null; config.target blank ->
        // targetKey is "" -> missing-target guard fires.
        samplerCompiler(
            draft,
            { source: "value", target: "   ", visible: true, max: 100 },
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Sampler ability missing target on 'sampler_bp'.",
        );
        expect(draft.components.behavior).toBeUndefined();
        warn.mockRestore();
    });

    it("reuses an existing behavior.rules array and appends the sampler rule", () => {
        const draft = createBlueprint("sampler_bp", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
                behavior: {
                    rules: [
                        {
                            id: "pre_existing",
                            sortKey: "sys_001",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
            },
        });

        samplerCompiler(
            draft,
            {
                source: "global.heat",
                target: "sampled_value",
                visible: true,
                max: 100,
            },
            0,
        );

        // The pre-existing rule is preserved (rules ??= [] must NOT clobber it);
        // sampler rule is pushed after it.
        expect(draft.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "pre_existing",
            "sys_sampler_sampled_heat_0",
        ]);
    });
});
