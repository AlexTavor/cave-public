import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { assignmentCompiler } from "./assignmentCompiler";

const compile = (config: Record<string, unknown>, withDisplay = false) => {
    const draft = createBlueprint("station", {
        components: withDisplay ? ({ display: {} } as any) : {},
    });
    assignmentCompiler(draft, {
        slots: 1,
        locking: false,
        filter: [],
        minimums: [],
        duration: 0,
        ...config,
    } as any);
    return draft;
};

describe("assignmentCompiler", () => {
    it("creates assignment component without processing state when results are absent", () => {
        const draft = compile({ slots: 2 });
        expect(draft.components.assignment).toMatchObject({
            slots: 2,
            locking: false,
            filter: [],
            assignedIds: [],
        });
        expect(draft.components.state?.processing_outputs).toBeUndefined();
        expect(
            draft.components.state?.processing_absorbs_habiti,
        ).toBeUndefined();
        expect(
            draft.components.state?.processing_destroys_assigned_bodies,
        ).toBeUndefined();
        expect(draft.components.state?.absorption_duration).toBeUndefined();
    });

    it("compiles spawn-resource rows into hidden processing outputs", () => {
        const draft = compile({
            results: [
                {
                    type: "spawn_resource",
                    resource: "wood",
                    source: "fixed",
                    factor: 2,
                },
            ],
        });
        expect(draft.components.state?.processing_outputs).toEqual({
            value: [
                {
                    resource: "wood",
                    source: "fixed",
                    factor: 2,
                    target: "sys_world",
                },
            ],
            visible: false,
        });
    });

    it("compiles transfer-habiti and destroy flags into hidden state", () => {
        const draft = compile({
            results: [
                { type: "transfer_habiti" },
                { type: "destroy_assigned_bodies" },
            ],
        });
        expect(draft.components.state?.processing_absorbs_habiti).toEqual({
            value: true,
            visible: false,
        });
        expect(
            draft.components.state?.processing_destroys_assigned_bodies,
        ).toEqual({ value: true, visible: false });
    });

    it("does not emit node-level progress state or bars", () => {
        const draft = compile({ duration: 20, showProgress: true }, true);
        expect(draft.components.state?.absorption_duration).toEqual({
            value: 20,
            visible: false,
        });
        expect(draft.components.state?.absorption_progress).toBeUndefined();
        expect(draft.components.display?.bars ?? []).toEqual([]);
    });

    it("builds the full assignment component (slots, locking, filter, minimums, ids)", () => {
        const draft = compile({
            slots: 3,
            locking: true,
            filter: [{ required_habiti_all: ["miner"] }],
            minimums: [{ habitus: "miner", count: 1 }],
        });

        expect(draft.components.assignment).toEqual({
            slots: 3,
            locking: true,
            filter: [{ required_habiti_all: ["miner"] }],
            minimums: [{ habitus: "miner", count: 1 }],
            assignedIds: [],
        });
    });

    it("carries source/factor/target and an explicit attribute into processing outputs", () => {
        const draft = compile({
            results: [
                {
                    type: "spawn_resource",
                    resource: "ore",
                    source: "attribute",
                    attribute: "mining",
                    factor: 3,
                    target: "sys_pool",
                },
            ],
        });

        expect(draft.components.state?.processing_outputs).toEqual({
            value: [
                {
                    resource: "ore",
                    source: "attribute",
                    attribute: "mining",
                    factor: 3,
                    target: "sys_pool",
                },
            ],
            visible: false,
        });
    });

    it("defaults factor to 1 and target to sys_world and omits attribute when absent", () => {
        const draft = compile({
            results: [
                { type: "spawn_resource", resource: "wood", source: "fixed" },
            ],
        });

        const outputs = (
            draft.components.state?.processing_outputs?.value as Record<
                string,
                unknown
            >[]
        )[0];
        // No `attribute` key at all when result.attribute is falsy.
        expect(outputs).toEqual({
            resource: "wood",
            source: "fixed",
            factor: 1,
            target: "sys_world",
        });
        expect("attribute" in outputs).toBe(false);
    });

    it("only spawn_resource rows become processing outputs (other types are dropped)", () => {
        const draft = compile({
            results: [
                { type: "transfer_habiti" },
                {
                    type: "spawn_resource",
                    resource: "wood",
                    source: "fixed",
                    factor: 2,
                },
                { type: "destroy_assigned_bodies" },
            ],
        });

        expect(draft.components.state?.processing_outputs).toEqual({
            value: [
                {
                    resource: "wood",
                    source: "fixed",
                    factor: 2,
                    target: "sys_world",
                },
            ],
            visible: false,
        });
    });

    it("does not set the habiti/destroy flags when only a spawn_resource is present", () => {
        // Drives the === checks at L55/L62 false even though `results` is non-empty.
        const draft = compile({
            results: [
                {
                    type: "spawn_resource",
                    resource: "wood",
                    source: "fixed",
                    factor: 1,
                },
            ],
        });

        expect(
            draft.components.state?.processing_absorbs_habiti,
        ).toBeUndefined();
        expect(
            draft.components.state?.processing_destroys_assigned_bodies,
        ).toBeUndefined();
    });

    it("omits absorption_duration when duration is zero", () => {
        const draft = compile({ duration: 0 });
        expect(draft.components.state?.absorption_duration).toBeUndefined();
    });

    it("does not create one-off depletion state or a GC rule when oneOff is false", () => {
        const draft = compile({ oneOff: false });
        // The one-off-only artifacts must be absent.
        expect(draft.components.state?.is_depleted).toBeUndefined();
        expect(
            draft.components.behavior?.rules?.some(
                (r) => r.id === "sys_cycle_gc",
            ) ?? false,
        ).toBe(false);
        // But prepareAssignmentCompletionTrigger always emits the completion
        // reset rule, so behavior itself is NOT empty.
        expect(
            draft.components.behavior?.rules?.map((r) => r.id),
        ).toEqual(["sys_assignment_complete_reset"]);
    });

    it("builds the full sys_cycle_gc rule (with storage-empty conditions) for one-off", () => {
        const draft = createBlueprint("station", { components: {} });
        assignmentCompiler(
            draft,
            {
                slots: 1,
                locking: false,
                filter: [],
                minimums: [],
                duration: 0,
                oneOff: true,
            } as never,
            {
                storage: [
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
                ],
            } as never,
        );

        const gc = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_gc",
        );
        expect(gc).toEqual({
            id: "sys_cycle_gc",
            sortKey: "sys_998",
            conditions: [
                {
                    id: "is_depleted",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.is_depleted.value" },
                        { t: "op", v: "==" },
                        { t: "val", v: 1 },
                    ],
                },
                {
                    id: "storage_empty_food",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: "self.state.food.value" },
                        { t: "op", v: "<=" },
                        { t: "val", v: 0 },
                    ],
                },
            ],
            actions: [{ type: "KILL", entityId: "self" }],
        });
    });

    it("tolerates undefined fullAbilities for a one-off (storage falls back to empty)", () => {
        const draft = createBlueprint("station", { components: {} });
        // fullAbilities omitted -> fullAbilities?.storage must be undefined-safe.
        assignmentCompiler(draft, {
            slots: 1,
            locking: false,
            filter: [],
            minimums: [],
            duration: 0,
            oneOff: true,
        } as never);

        const gc = draft.components.behavior?.rules?.find(
            (r) => r.id === "sys_cycle_gc",
        );
        // Only the is_depleted condition; no storage_empty_* since storage is empty.
        expect(gc?.conditions).toEqual([
            {
                id: "is_depleted",
                sortKey: "0",
                tokens: [
                    { t: "ref", v: "self.state.is_depleted.value" },
                    { t: "op", v: "==" },
                    { t: "val", v: 1 },
                ],
            },
        ]);
    });

    it("does not add a second sys_cycle_gc rule when one already exists", () => {
        const draft = createBlueprint("station", {
            components: {
                behavior: {
                    rules: [
                        {
                            id: "sys_cycle_gc",
                            sortKey: "sys_998",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
            },
        });

        assignmentCompiler(draft, {
            slots: 1,
            locking: false,
            filter: [],
            minimums: [],
            duration: 0,
            oneOff: true,
        } as never);

        const gcRules = draft.components.behavior?.rules?.filter(
            (r) => r.id === "sys_cycle_gc",
        );
        expect(gcRules).toHaveLength(1);
        // The pre-existing (empty) rule is the one kept untouched.
        expect(gcRules?.[0]?.conditions).toEqual([]);
    });

    it("appends the GC rule after unrelated existing rules (id mismatch path)", () => {
        const draft = createBlueprint("station", {
            components: {
                behavior: {
                    rules: [
                        {
                            id: "sys_other_rule",
                            sortKey: "sys_001",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
            },
        });

        assignmentCompiler(draft, {
            slots: 1,
            locking: false,
            filter: [],
            minimums: [],
            duration: 0,
            oneOff: true,
        } as never);

        const ids = draft.components.behavior?.rules?.map((r) => r.id);
        // prepareAssignmentCompletionTrigger appends its reset rule before the
        // one-off GC rule is pushed, so it lands between the two.
        expect(ids).toEqual([
            "sys_other_rule",
            "sys_assignment_complete_reset",
            "sys_cycle_gc",
        ]);
    });

    it("treats missing results as empty and emits no processing state", () => {
        const draft = compile({ results: undefined });
        expect(draft.components.state?.processing_outputs).toBeUndefined();
        expect(
            draft.components.state?.processing_absorbs_habiti,
        ).toBeUndefined();
        expect(
            draft.components.state?.processing_destroys_assigned_bodies,
        ).toBeUndefined();
    });
});

