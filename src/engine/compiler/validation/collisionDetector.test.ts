import { describe, it, expect } from "vitest";
import type { EditorConfig } from "../../../data/schemas/abilities";
import type { ProductionAbilityConfig } from "../../../data/schemas/abilities/production";
import type { SamplerAbilityConfig } from "../../../data/schemas/abilities/sampler";
import type { SpawnerAbilityConfig } from "../../../data/schemas/abilities/spawner";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import type { UpdaterAbilityConfig } from "../../../data/schemas/abilities/updater";
import type { UpkeepAbilityConfig } from "../../../data/schemas/abilities/upkeep";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import type { ValidationIssue } from "./collisionDetector.types";
import { collisionDetector } from "./collisionDetector";

const makeStorage = (resource: string): StorageAbilityConfig => ({
    resource,
    initialValue: 0,
    capacity: { base: 0, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    barPosition: "top_left" as const,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
});

const makeUpkeep = (resource: string): UpkeepAbilityConfig => ({
    resource,
    rate: { base: 1, perBody: 0, multPerBody: 0 },
    failureTrait: "is_starving",
    autoRequest: true,
});

const makeProduction = (resource: string): ProductionAbilityConfig => ({
    resource,
    amount: { base: 1, perBody: 0, multPerBody: 0 },
    conditions: [],
});

const makeUpdater = (
    overrides: Partial<UpdaterAbilityConfig> = {},
): UpdaterAbilityConfig => ({
    id: "upd",
    target: "self.state.counter.value",
    op: "ADD",
    value: 1,
    triggers: ["cycle_complete"],
    conditions: [],
    ...overrides,
});

const makeCycle = (): CycleAbilityConfig => ({
    maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
    costMultPerCycle: 0,
    inputs: {},
    oneOff: false,
    conditions: [],
});

const makeSampler = (
    overrides: Partial<SamplerAbilityConfig> = {},
): SamplerAbilityConfig => ({
    id: "sample",
    source: "self.state.energy.value",
    target: "sampled_value",
    visible: true,
    max: 100,
    triggers: ["cycle_complete"],
    ...overrides,
});

const makeSpawner = (
    overrides: Partial<SpawnerAbilityConfig> = {},
): SpawnerAbilityConfig => ({
    id: "spawn",
    blueprintId: "child_bp",
    count: { base: 1, perBody: 0, multPerBody: 0 },
    mode: "spawn_body",
    target: "sys_world",
    forcedHabiti: [],
    triggers: ["cycle_complete"],
    conditions: [],
    ...overrides,
});

describe("collisionDetector", () => {
    it("flags malformed storage entries that will be removed", () => {
        const editor: EditorConfig = {
            abilities: {
                storage: [makeStorage("")],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "storage_invalid_0")).toBe(true);
    });
    it("flags duplicate resource entries", () => {
        const editor: EditorConfig = {
            abilities: {
                storage: [makeStorage("wood"), makeStorage("wood")],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "storage_duplicate_wood")).toBe(
            true,
        );
    });

    it("warns when upkeep lacks matching storage", () => {
        const editor: EditorConfig = {
            abilities: {
                storage: [makeStorage("food")],
                upkeep: [makeUpkeep("wood")],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues[0]?.severity).toBe("warning");
    });

    it("flags cycle write collisions with conversion resets", () => {
        const editor: EditorConfig = {
            abilities: {
                cycle: {
                    maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
                    costMultPerCycle: 0,
                    inputs: {},
                    oneOff: false,
                    conditions: [],
                },
                conversion: [
                    {
                        id: "conv",
                        inputs: [],
                        outputs: [],
                        resetCycle: true,
                        conditions: [],
                    },
                ],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "cycle_state_collision")).toBe(true);
    });

    it("flags conversion entries with missing resources", () => {
        const editor: EditorConfig = {
            abilities: {
                conversion: [
                    {
                        id: "conv",
                        inputs: [
                            {
                                resource: "",
                                amount: { base: 1, perBody: 0, multPerBody: 0 },
                            },
                        ],
                        outputs: [],
                        resetCycle: true,
                        conditions: [],
                    },
                ],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "conversion_invalid_0")).toBe(true);
    });

    it("flags production when cycle is missing", () => {
        const editor: EditorConfig = {
            abilities: {
                production: [
                    {
                        resource: "wood",
                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                        conditions: [],
                    },
                ],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "production_requires_cycle")).toBe(
            true,
        );
    });

    it("returns an empty array for an undefined editor (optional-chaining guard)", () => {
        // editor?.abilities ?? {} -> no abilities -> no issues at all.
        expect(collisionDetector(undefined)).toEqual([]);
    });

    it("returns an empty array for an editor with empty abilities", () => {
        expect(collisionDetector({ abilities: {} })).toEqual([]);
    });

    describe("buildUpdaterDependencyIssues", () => {
        it("warns (exact issue) when an updater triggers on cycle_complete but no cycle exists", () => {
            const editor: EditorConfig = {
                abilities: {
                    updater: [makeUpdater({ triggers: ["cycle_complete"] })],
                },
            };

            // Full deep-equal of the only emitted issue pins every literal:
            // id, severity ("warning" not "error"), message, ability.
            expect(collisionDetector(editor)).toEqual<ValidationIssue[]>([
                {
                    id: "updater-requires-cycle",
                    severity: "warning",
                    message:
                        "Updater abilities require a Cycle ability to trigger.",
                    ability: "updater",
                },
            ]);
        });

        it("warns when an updater omits triggers entirely (defaults to cycle_complete)", () => {
            // requiresCycleAbility defaults a missing triggers array to ["cycle_complete"].
            const editor = {
                abilities: {
                    updater: [
                        {
                            id: "upd",
                            target: "self.state.counter.value",
                            op: "ADD",
                            value: 1,
                            conditions: [],
                        },
                    ],
                },
            } as unknown as EditorConfig;

            expect(
                collisionDetector(editor).some(
                    (i) => i.id === "updater-requires-cycle",
                ),
            ).toBe(true);
        });

        it("does NOT warn when an updater is present alongside a cycle ability", () => {
            const editor: EditorConfig = {
                abilities: {
                    cycle: makeCycle(),
                    updater: [makeUpdater({ triggers: ["cycle_complete"] })],
                },
            };

            // !abilities.cycle is false -> the && short-circuits -> no issue.
            expect(
                collisionDetector(editor).some(
                    (i) => i.id === "updater-requires-cycle",
                ),
            ).toBe(false);
        });

        it("does NOT warn when the updater never triggers on cycle_complete", () => {
            const editor: EditorConfig = {
                abilities: {
                    updater: [
                        makeUpdater({ triggers: ["assignment_complete"] }),
                    ],
                },
            };

            // requiresCycleAbility is false -> the && short-circuits -> no issue.
            expect(
                collisionDetector(editor).some(
                    (i) => i.id === "updater-requires-cycle",
                ),
            ).toBe(false);
        });

        it("does NOT warn when there is no updater ability at all", () => {
            const editor: EditorConfig = { abilities: { cycle: makeCycle() } };

            expect(
                collisionDetector(editor).some(
                    (i) => i.id === "updater-requires-cycle",
                ),
            ).toBe(false);
        });
    });

    describe("duplicate resource aggregation", () => {
        it("flags duplicate production resources with the production-labelled id", () => {
            const editor: EditorConfig = {
                abilities: {
                    cycle: makeCycle(),
                    production: [makeProduction("wood"), makeProduction("wood")],
                },
            };

            // Locks the "production" string literal in the duplicate id/ability/message.
            expect(collisionDetector(editor)).toContainEqual({
                id: "production_duplicate_wood",
                severity: "error",
                ability: "production",
                message: "Duplicate production entries for 'wood'.",
            });
        });

        it("flags duplicate upkeep resources with the upkeep-labelled id", () => {
            const editor: EditorConfig = {
                abilities: {
                    storage: [makeStorage("wood")],
                    upkeep: [makeUpkeep("wood"), makeUpkeep("wood")],
                },
            };

            // Locks the "upkeep" string literal in the duplicate id/ability/message.
            expect(collisionDetector(editor)).toContainEqual({
                id: "upkeep_duplicate_wood",
                severity: "error",
                ability: "upkeep",
                message: "Duplicate upkeep entries for 'wood'.",
            });
        });

        it("trims whitespace when grouping duplicate resources (normalizeResource arrow)", () => {
            const editor: EditorConfig = {
                abilities: {
                    storage: [makeStorage("wood"), makeStorage("  wood  ")],
                },
            };

            // "wood" and "  wood  " must normalize to the same key -> one duplicate issue.
            expect(collisionDetector(editor)).toContainEqual({
                id: "storage_duplicate_wood",
                severity: "error",
                ability: "storage",
                message: "Duplicate storage entries for 'wood'.",
            });
        });

        it("does NOT flag distinct production resources as duplicates", () => {
            const editor: EditorConfig = {
                abilities: {
                    cycle: makeCycle(),
                    production: [makeProduction("wood"), makeProduction("food")],
                },
            };

            expect(
                collisionDetector(editor).some((i) =>
                    i.id.startsWith("production_duplicate_"),
                ),
            ).toBe(false);
        });
    });

    describe("reservedStateKeys option", () => {
        it("uses the default reserved keys (cycle/physics/display) when none are passed", () => {
            for (const reserved of ["cycle", "physics", "display"]) {
                const editor: EditorConfig = {
                    abilities: {
                        // empty source -> derived key is null -> falls back to target.
                        sampler: [makeSampler({ source: "", target: reserved })],
                    },
                };

                // No reservedStateKeys option -> the default array supplies `reserved`.
                expect(collisionDetector(editor)).toContainEqual({
                    id: `sampler_target_collision_${reserved}`,
                    severity: "error",
                    ability: "sampler",
                    message: `Sampler target '${reserved}' collides with existing state.`,
                });
            }
        });

        it("treats a target as free when it is NOT in the default reserved set", () => {
            const editor: EditorConfig = {
                abilities: {
                    sampler: [
                        makeSampler({ source: "", target: "not_reserved" }),
                    ],
                },
            };

            expect(
                collisionDetector(editor).some((i) =>
                    i.id.startsWith("sampler_target_collision_"),
                ),
            ).toBe(false);
        });

        it("overrides the default reserved keys when reservedStateKeys is passed", () => {
            const editor: EditorConfig = {
                abilities: {
                    sampler: [makeSampler({ source: "", target: "physics" })],
                },
            };

            // Custom reserved set excludes "physics" -> the default no longer applies.
            const issues = collisionDetector(editor, {
                reservedStateKeys: ["custom_key"],
            });
            expect(
                issues.some(
                    (i) => i.id === "sampler_target_collision_physics",
                ),
            ).toBe(false);

            // And a sampler target matching the custom reserved key DOES collide.
            const collidingEditor: EditorConfig = {
                abilities: {
                    sampler: [
                        makeSampler({ source: "", target: "custom_key" }),
                    ],
                },
            };
            expect(
                collisionDetector(collidingEditor, {
                    reservedStateKeys: ["custom_key"],
                }),
            ).toContainEqual({
                id: "sampler_target_collision_custom_key",
                severity: "error",
                ability: "sampler",
                message:
                    "Sampler target 'custom_key' collides with existing state.",
            });
        });
    });

    describe("blueprintIds and stateKeys options", () => {
        it("flags a spawner whose blueprintId is absent from a non-empty blueprintIds set", () => {
            const editor: EditorConfig = {
                abilities: {
                    cycle: makeCycle(),
                    spawner: [makeSpawner({ blueprintId: "ghost_bp" })],
                },
            };

            expect(
                collisionDetector(editor, { blueprintIds: ["known_bp"] }),
            ).toContainEqual({
                id: "spawner_missing_ghost_bp_0",
                severity: "warning",
                ability: "spawner",
                message: "Spawner target 'ghost_bp' does not exist.",
            });
        });

        it("does NOT flag a spawner blueprint when blueprintIds is omitted (defaults to empty)", () => {
            const editor: EditorConfig = {
                abilities: {
                    cycle: makeCycle(),
                    spawner: [makeSpawner({ blueprintId: "ghost_bp" })],
                },
            };

            // Empty blueprintIds set -> buildSpawnerBlueprintIssues short-circuits.
            expect(
                collisionDetector(editor).some((i) =>
                    i.id.startsWith("spawner_missing_"),
                ),
            ).toBe(false);
        });

        it("does NOT flag a spawner whose blueprintId IS present in the blueprintIds set", () => {
            const editor: EditorConfig = {
                abilities: {
                    cycle: makeCycle(),
                    spawner: [makeSpawner({ blueprintId: "known_bp" })],
                },
            };

            expect(
                collisionDetector(editor, {
                    blueprintIds: ["known_bp"],
                }).some((i) => i.id.startsWith("spawner_missing_")),
            ).toBe(false);
        });

        it("accepts a non-empty stateKeys option without spuriously colliding a sampler's own derived target", () => {
            // buildSamplerTargetIssues excludes each sampler's OWN derived target
            // from the collision set, so a stateKey equal to that target is a no-op.
            // This drives options.stateKeys through Set construction on a real array.
            const editor: EditorConfig = {
                abilities: {
                    cycle: makeCycle(),
                    sampler: [makeSampler({ source: "self.state.heat.value" })],
                },
            };

            expect(
                collisionDetector(editor, {
                    stateKeys: ["sampled_heat"],
                }).some((i) => i.id.startsWith("sampler_target_collision_")),
            ).toBe(false);
        });

        it("does NOT collide a sampler when the provided stateKeys do not overlap reserved keys", () => {
            const editor: EditorConfig = {
                abilities: {
                    cycle: makeCycle(),
                    sampler: [makeSampler({ source: "self.state.heat.value" })],
                },
            };

            expect(
                collisionDetector(editor, {
                    stateKeys: ["unrelated_key"],
                }).some((i) => i.id.startsWith("sampler_target_collision_")),
            ).toBe(false);
        });
    });
});

