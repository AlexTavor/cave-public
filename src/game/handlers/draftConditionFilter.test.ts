import { describe, expect, it } from "vitest";
import { filterDraftEntriesByConditions } from "./draftConditionFilter";
import type { DraftOptionBlueprint } from "../../data/schemas/draft";
import { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { createEntity } from "../../engine/test/factories";

const impulseEngine = new ImpulseEngine(DEFAULT_IMPULSE_CONFIG);

const makeOption = (
    id: string,
    overrides: Partial<DraftOptionBlueprint> = {},
): DraftOptionBlueprint => ({
    id,
    title: id,
    description: "",
    rarity: "common",
    icon: "wood",
    payload: [],
    ...overrides,
});

const makeWorld = () => [createEntity("sys_world", { state: {} })];

describe("filterDraftEntriesByConditions", () => {
    it("keeps entries with no conditions", () => {
        const options = { a: makeOption("a") };
        const result = filterDraftEntriesByConditions({
            pool: {
                id: "p",
                texts: [],
                entries: [{ optionId: "a", weight: 1 }],
            },
            options,
            worldEntities: makeWorld(),
            impulseEngine,
            triggerEntityId: "sys_world",
        });
        expect(result).toHaveLength(1);
    });

    it("excludes a picked one-off option", () => {
        const options = { a: makeOption("a", { oneOff: true }) };
        const result = filterDraftEntriesByConditions({
            pool: {
                id: "p",
                texts: [],
                entries: [{ optionId: "a", weight: 1 }],
            },
            options,
            worldEntities: makeWorld(),
            impulseEngine,
            triggerEntityId: "sys_world",
            pickedOneOffs: ["a"],
        });
        expect(result).toHaveLength(0);
    });

    it("keeps a one-off option that was not yet picked", () => {
        const options = { a: makeOption("a", { oneOff: true }) };
        const result = filterDraftEntriesByConditions({
            pool: {
                id: "p",
                texts: [],
                entries: [{ optionId: "a", weight: 1 }],
            },
            options,
            worldEntities: makeWorld(),
            impulseEngine,
            triggerEntityId: "sys_world",
            pickedOneOffs: [],
        });
        expect(result).toHaveLength(1);
    });

    it("keeps non-one-off options regardless of history", () => {
        const options = { a: makeOption("a", { oneOff: false }) };
        const result = filterDraftEntriesByConditions({
            pool: {
                id: "p",
                texts: [],
                entries: [{ optionId: "a", weight: 1 }],
            },
            options,
            worldEntities: makeWorld(),
            impulseEngine,
            triggerEntityId: "sys_world",
            pickedOneOffs: ["a"],
        });
        expect(result).toHaveLength(1);
    });

    it("returns empty when all options are picked one-offs", () => {
        const options = {
            a: makeOption("a", { oneOff: true }),
            b: makeOption("b", { oneOff: true }),
        };
        const result = filterDraftEntriesByConditions({
            pool: {
                id: "p",
                texts: [],
                entries: [
                    { optionId: "a", weight: 1 },
                    { optionId: "b", weight: 1 },
                ],
            },
            options,
            worldEntities: makeWorld(),
            impulseEngine,
            triggerEntityId: "sys_world",
            pickedOneOffs: ["a", "b"],
        });
        expect(result).toHaveLength(0);
    });

    it("filters draft options by referenced condition ids", () => {
        const options = {
            a: makeOption("a", { conditionIds: ["throttle_ready"] }),
            b: makeOption("b"),
        };
        const result = filterDraftEntriesByConditions({
            pool: {
                id: "p",
                texts: [],
                entries: [
                    { optionId: "a", weight: 1 },
                    { optionId: "b", weight: 1 },
                ],
            },
            options,
            conditions: [
                {
                    id: "throttle_ready",
                    label: "Throttle Ready",
                    selfDefinition: { kind: "auto" },
                    conditions: [
                        {
                            kind: "fact_threshold",
                            scope: "run",
                            factType: "throttle_level",
                            factAbout: "self",
                            operator: ">",
                            value: 0.5,
                        },
                    ],
                },
            ] as any,
            worldEntities: [
                ...makeWorld(),
                createEntity("body", { powerSink: { throttle: 0.25 } }),
            ],
            impulseEngine,
            triggerEntityId: "body",
        });
        expect(result.map((entry) => entry.optionId)).toEqual(["b"]);
    });

    it("uses a condition definition's authored self when evaluating drafts", () => {
        const options = {
            a: makeOption("a", { conditionIds: ["throttle_ready"] }),
        };
        const result = filterDraftEntriesByConditions({
            pool: {
                id: "p",
                texts: [],
                entries: [{ optionId: "a", weight: 1 }],
            },
            options,
            conditions: [
                {
                    id: "throttle_ready",
                    label: "Throttle Ready",
                    selfDefinition: { kind: "entity_id", entityId: "other" },
                    conditions: [
                        {
                            kind: "fact_threshold",
                            scope: "run",
                            factType: "throttle_level",
                            factAbout: "self",
                            operator: ">",
                            value: 0.5,
                        },
                    ],
                },
            ] as any,
            worldEntities: [
                ...makeWorld(),
                createEntity("body", { powerSink: { throttle: 0.25 } }),
                createEntity("other", { powerSink: { throttle: 0.75 } }),
            ],
            impulseEngine,
            triggerEntityId: "body",
        });
        expect(result.map((entry) => entry.optionId)).toEqual(["a"]);
    });
});

