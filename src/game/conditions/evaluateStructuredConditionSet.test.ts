import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateStructuredConditionSet } from "./evaluateStructuredConditionSet";

const snapshot = (entities: Record<string, unknown>[]) =>
    new Snapshot(entities as any, { getBody: () => undefined } as any);

describe("evaluateStructuredConditionSet", () => {
    it("evaluates entity tag presence and world state booleans", () => {
        const result = evaluateStructuredConditionSet(
            snapshot([
                { id: "sys_world", state: { seen: { value: true } } },
                { id: "explore-1", tags: ["cave_exploration"] },
            ]),
            [
                { kind: "entity_tag_present", tag: "cave_exploration" },
                { kind: "world_state_boolean", key: "seen", value: true },
            ],
        );
        expect(result).toBe(true);
    });

    it("returns false for missing tags, missing keys, and mixed failures", () => {
        expect(
            evaluateStructuredConditionSet(
                snapshot([{ id: "sys_world", state: {} }]),
                [{ kind: "entity_tag_present", tag: "missing" }],
            ),
        ).toBe(false);
        expect(
            evaluateStructuredConditionSet(
                snapshot([{ id: "sys_world", state: {} }]),
                [{ kind: "world_state_boolean", key: "seen", value: true }],
            ),
        ).toBe(false);
        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world", state: { seen: { value: true } } },
                    { id: "explore-1", tags: ["other"] },
                ]),
                [
                    { kind: "entity_tag_present", tag: "cave_exploration" },
                    { kind: "world_state_boolean", key: "seen", value: true },
                ],
            ),
        ).toBe(false);
    });

    it("evaluates throttle_level against the provided self entity", () => {
        const result = evaluateStructuredConditionSet(
            snapshot([{ id: "sys_world", state: {} }, { id: "body" }]),
            [
                {
                    kind: "fact_threshold",
                    scope: "run",
                    factType: "throttle_level",
                    factAbout: "self",
                    operator: ">",
                    value: 0.5,
                },
            ],
            { id: "body", powerSink: { throttle: 0.75 } } as any,
        );
        expect(result).toBe(true);
    });

    it("evaluates understanding_owned facts from the world fact store", () => {
        const condition = {
            kind: "fact_threshold",
            scope: "run",
            factType: "understanding_owned",
            factAbout: "insight",
            operator: ">=",
            value: 1,
        } as const;

        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    {
                        id: "sys_world",
                        run: { understanding_owned: { insight: 1 } },
                    },
                ]),
                [condition],
            ),
        ).toBe(true);
        expect(
            evaluateStructuredConditionSet(
                snapshot([{ id: "sys_world", run: {} }]),
                [condition],
            ),
        ).toBe(false);
    });

    it("evaluates run_number facts through the generic world fact path", () => {
        const condition = {
            kind: "fact_threshold",
            scope: "run",
            factType: "run_number",
            factAbout: "world",
            operator: ">=",
            value: 3,
        } as const;

        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world", run: { run_number: { world: 3 } } },
                ]),
                [condition],
            ),
        ).toBe(true);
        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world", run: { run_number: { world: 2 } } },
                ]),
                [condition],
            ),
        ).toBe(false);
    });
});
