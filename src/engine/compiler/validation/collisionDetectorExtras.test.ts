import { describe, expect, it } from "vitest";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import {
    buildSamplerTargetIssues,
    buildSpawnerBlueprintIssues,
    detectExtraCollisions,
} from "./collisionDetectorExtras";

// A spawner entry that triggers on cycle_complete (default) -> "requires cycle".
const spawnerEntry = (overrides: Record<string, unknown> = {}) => ({
    blueprintId: "bp_child",
    count: { base: 1, perBody: 0, multPerBody: 0 },
    mode: "spawn_body" as const,
    target: "sys_world",
    conditions: [],
    ...overrides,
});

// A minimal cycle ability so `abilities.cycle` is truthy.
const cycleAbility = {
    maxProgress: { base: 1, perBody: 0, multPerBody: 0 },
    costMultPerCycle: 0,
    inputs: {},
    oneOff: false,
    conditions: [],
};

describe("detectExtraCollisions — dependency rules", () => {
    it("flags every cycle-dependent ability at once when none has a cycle (full deep-equal)", () => {
        const abilities = {
            spawner: [spawnerEntry()],
            sampler: [{ source: "sys_world.state.heat.value" }],
            draft: [{ poolId: "pool_a" }],
            triggeredActions: [
                {
                    id: "ta-1",
                    triggers: ["cycle_complete"],
                    conditions: [],
                    actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 1 }],
                },
            ],
        } as unknown as EditorAbilities;

        // The flatMap walks collisionRules in declared order: spawner, sampler,
        // draft, triggeredActions. Deep-equal pins id/severity/ability/message
        // for all four issue objects in that exact order.
        expect(detectExtraCollisions(abilities)).toEqual([
            {
                id: "spawner_requires_cycle",
                severity: "error",
                ability: "spawner",
                message: "Spawner Ability requires a Cycle Ability to trigger.",
            },
            {
                id: "sampler_requires_cycle",
                severity: "error",
                ability: "sampler",
                message: "Sampler Ability requires a Cycle Ability to trigger.",
            },
            {
                id: "draft_requires_cycle",
                severity: "error",
                ability: "draft",
                message: "Draft Ability requires a Cycle Ability to trigger.",
            },
            {
                id: "triggered_actions_requires_cycle",
                severity: "error",
                ability: "triggeredActions",
                message:
                    "Triggered Actions ability requires a Cycle Ability to trigger.",
            },
        ]);
    });

    it("emits NO dependency issues when a cycle ability is present (cycle side of the || true)", () => {
        const abilities = {
            cycle: cycleAbility,
            spawner: [spawnerEntry()],
            sampler: [{ source: "sys_world.state.heat.value" }],
            draft: [{ poolId: "pool_a" }],
            triggeredActions: [
                {
                    id: "ta-1",
                    triggers: ["cycle_complete"],
                    conditions: [],
                    actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 1 }],
                },
            ],
        } as unknown as EditorAbilities;

        expect(detectExtraCollisions(abilities)).toEqual([]);
    });

    it("emits NO dependency issues when abilities are assignment-triggered (requires-cycle side false)", () => {
        // triggers explicitly exclude cycle_complete -> requiresCycleAbility is false
        // even though there is no cycle ability. Drives the !requires branch.
        const abilities = {
            spawner: [spawnerEntry({ triggers: ["assignment_complete"] })],
            sampler: [
                {
                    source: "sys_world.state.heat.value",
                    triggers: ["assignment_complete"],
                },
            ],
            draft: [
                { poolId: "pool_a", triggers: ["assignment_complete"] },
            ],
            triggeredActions: [
                {
                    id: "ta-1",
                    triggers: ["assignment_complete"],
                    conditions: [],
                    actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 1 }],
                },
            ],
        } as unknown as EditorAbilities;

        expect(detectExtraCollisions(abilities)).toEqual([]);
    });

    it("returns [] for fully empty abilities (no ability arrays present)", () => {
        expect(detectExtraCollisions({} as EditorAbilities)).toEqual([]);
    });

    it("flags ONLY the spawner when spawner alone lacks its cycle", () => {
        const abilities = {
            spawner: [spawnerEntry()],
        } as unknown as EditorAbilities;

        expect(detectExtraCollisions(abilities)).toEqual([
            {
                id: "spawner_requires_cycle",
                severity: "error",
                ability: "spawner",
                message: "Spawner Ability requires a Cycle Ability to trigger.",
            },
        ]);
    });

    it("flags ONLY the sampler when sampler alone lacks its cycle", () => {
        const abilities = {
            sampler: [{ source: "sys_world.state.heat.value" }],
        } as unknown as EditorAbilities;

        expect(detectExtraCollisions(abilities)).toEqual([
            {
                id: "sampler_requires_cycle",
                severity: "error",
                ability: "sampler",
                message: "Sampler Ability requires a Cycle Ability to trigger.",
            },
        ]);
    });

    it("flags ONLY the draft when draft alone lacks its cycle", () => {
        const abilities = {
            draft: [{ poolId: "pool_a" }],
        } as unknown as EditorAbilities;

        expect(detectExtraCollisions(abilities)).toEqual([
            {
                id: "draft_requires_cycle",
                severity: "error",
                ability: "draft",
                message: "Draft Ability requires a Cycle Ability to trigger.",
            },
        ]);
    });

    it("flags ONLY triggeredActions when it alone lacks its cycle", () => {
        const abilities = {
            triggeredActions: [
                {
                    id: "ta-1",
                    triggers: ["cycle_complete"],
                    conditions: [],
                    actions: [{ type: "KILL_ALL_BODIES_EXCEPT", quantity: 1 }],
                },
            ],
        } as unknown as EditorAbilities;

        expect(detectExtraCollisions(abilities)).toEqual([
            {
                id: "triggered_actions_requires_cycle",
                severity: "error",
                ability: "triggeredActions",
                message:
                    "Triggered Actions ability requires a Cycle Ability to trigger.",
            },
        ]);
    });
});

describe("buildSpawnerBlueprintIssues", () => {
    it("returns [] when there are no spawner entries", () => {
        expect(
            buildSpawnerBlueprintIssues(
                {} as EditorAbilities,
                new Set(["bp_a"]),
            ),
        ).toEqual([]);
    });

    it("returns [] when the blueprintIds set is empty (size === 0 guard)", () => {
        const abilities = {
            spawner: [spawnerEntry({ blueprintId: "bp_missing" })],
        } as unknown as EditorAbilities;

        expect(buildSpawnerBlueprintIssues(abilities, new Set())).toEqual([]);
    });

    it("returns [] when every spawner blueprintId exists in the set (has() true)", () => {
        const abilities = {
            spawner: [
                spawnerEntry({ blueprintId: "bp_a" }),
                spawnerEntry({ blueprintId: "bp_b" }),
            ],
        } as unknown as EditorAbilities;

        expect(
            buildSpawnerBlueprintIssues(
                abilities,
                new Set(["bp_a", "bp_b"]),
            ),
        ).toEqual([]);
    });

    it("warns with the full issue (id encodes trimmed blueprintId + index) for a missing target", () => {
        const abilities = {
            spawner: [spawnerEntry({ blueprintId: "  bp_missing  " })],
        } as unknown as EditorAbilities;

        // blueprintId is trimmed before the id is built AND before has() is checked.
        expect(
            buildSpawnerBlueprintIssues(abilities, new Set(["bp_other"])),
        ).toEqual([
            {
                id: "spawner_missing_bp_missing_0",
                severity: "warning",
                ability: "spawner",
                message: "Spawner target 'bp_missing' does not exist.",
            },
        ]);
    });

    it("uses the entry index in the id and skips entries whose target exists", () => {
        const abilities = {
            spawner: [
                spawnerEntry({ blueprintId: "bp_present" }), // index 0, exists -> skip
                spawnerEntry({ blueprintId: "bp_gone" }), // index 1, missing -> warn
            ],
        } as unknown as EditorAbilities;

        expect(
            buildSpawnerBlueprintIssues(abilities, new Set(["bp_present"])),
        ).toEqual([
            {
                id: "spawner_missing_bp_gone_1",
                severity: "warning",
                ability: "spawner",
                message: "Spawner target 'bp_gone' does not exist.",
            },
        ]);
    });

    it("skips an entry whose blueprintId trims to empty (falsy blueprgetId guard)", () => {
        const abilities = {
            spawner: [spawnerEntry({ blueprintId: "   " })],
        } as unknown as EditorAbilities;

        expect(
            buildSpawnerBlueprintIssues(abilities, new Set(["bp_a"])),
        ).toEqual([]);
    });

    it("treats a missing blueprintId (optional-chaining null) as skipped, not a crash", () => {
        const abilities = {
            spawner: [{ count: { base: 1, perBody: 0, multPerBody: 0 } }],
        } as unknown as EditorAbilities;

        expect(
            buildSpawnerBlueprintIssues(abilities, new Set(["bp_a"])),
        ).toEqual([]);
    });
});

describe("buildSamplerTargetIssues", () => {
    const reserved = new Set(["cycle", "physics", "display"]);

    it("returns [] when there are no sampler entries", () => {
        expect(
            buildSamplerTargetIssues(
                {} as EditorAbilities,
                new Set<string>(),
                reserved,
            ),
        ).toEqual([]);
    });

    it("derives the target key from source and reports nothing for a non-colliding distinct key", () => {
        const abilities = {
            sampler: [{ source: "sys_world.state.heat.value" }],
        } as unknown as EditorAbilities;

        // source -> deriveSamplerTargetKey -> "sampled_heat"; stateKeys has only
        // "heat" (different), so nonSamplerState = {heat}, no collision, no dup.
        expect(
            buildSamplerTargetIssues(abilities, new Set(["heat"]), reserved),
        ).toEqual([]);
    });

    it("emits a duplicate issue (once) when two entries resolve to the same target", () => {
        const abilities = {
            sampler: [
                { source: "sys_world.state.heat.value" },
                { source: "other.path.heat.value" },
            ],
        } as unknown as EditorAbilities;

        // Both derive to "sampled_heat" -> duplicated. Array.from(new Set(...))
        // collapses to a single duplicate issue.
        expect(
            buildSamplerTargetIssues(abilities, new Set<string>(), reserved),
        ).toEqual([
            {
                id: "sampler_target_duplicate_sampled_heat",
                severity: "error",
                ability: "sampler",
                message: "Sampler target 'sampled_heat' is duplicated.",
            },
        ]);
    });

    it("emits a collision issue when a target matches a reserved key", () => {
        const abilities = {
            sampler: [{ source: "", target: "cycle" }],
        } as unknown as EditorAbilities;

        // Empty source -> falls back to entry.target ("cycle"). "cycle" is reserved
        // -> collision. No duplicate (single entry).
        expect(
            buildSamplerTargetIssues(abilities, new Set<string>(), reserved),
        ).toEqual([
            {
                id: "sampler_target_collision_cycle",
                severity: "error",
                ability: "sampler",
                message: "Sampler target 'cycle' collides with existing state.",
            },
        ]);
    });

    it("does NOT collide when a stateKey equals the target (it is excluded from nonSamplerState)", () => {
        const abilities = {
            sampler: [{ source: "", target: "morale" }],
        } as unknown as EditorAbilities;

        // "morale" is BOTH the sampler target and a stateKey, so the
        // `stateKeys.filter(k => !samplerTargets.includes(k))` step removes it
        // from nonSamplerState. The state-collision branch therefore cannot fire
        // for a sampler-derived target; only reservedKeys can trigger one.
        expect(
            buildSamplerTargetIssues(
                abilities,
                new Set(["morale"]),
                reserved,
            ),
        ).toEqual([]);
    });

    it("does NOT flag a collision when the colliding state key IS the sampler's own derived target", () => {
        const abilities = {
            sampler: [{ source: "sys_world.state.heat.value" }],
        } as unknown as EditorAbilities;

        // stateKeys contains "sampled_heat" — but it is exactly the sampler's own
        // target, so it is excluded from nonSamplerState -> NO collision.
        expect(
            buildSamplerTargetIssues(
                abilities,
                new Set(["sampled_heat"]),
                reserved,
            ),
        ).toEqual([]);
    });

    it("returns both duplicate and collision issues in order (duplicates first)", () => {
        const abilities = {
            sampler: [
                { source: "", target: "cycle" },
                { source: "", target: "cycle" },
            ],
        } as unknown as EditorAbilities;

        // Two identical reserved targets: one duplicate issue, then a collision
        // issue for EACH occurrence (collisionIssues is a flatMap over targets).
        expect(
            buildSamplerTargetIssues(abilities, new Set<string>(), reserved),
        ).toEqual([
            {
                id: "sampler_target_duplicate_cycle",
                severity: "error",
                ability: "sampler",
                message: "Sampler target 'cycle' is duplicated.",
            },
            {
                id: "sampler_target_collision_cycle",
                severity: "error",
                ability: "sampler",
                message: "Sampler target 'cycle' collides with existing state.",
            },
            {
                id: "sampler_target_collision_cycle",
                severity: "error",
                ability: "sampler",
                message: "Sampler target 'cycle' collides with existing state.",
            },
        ]);
    });

    it("trims source before deriving and trims a fallback target", () => {
        const abilities = {
            sampler: [{ source: "   ", target: "  cycle  " }],
        } as unknown as EditorAbilities;

        // Whitespace source -> falsy after trim -> uses entry.target; the final
        // (derived ?? target ?? "").trim() strips the padding to "cycle".
        expect(
            buildSamplerTargetIssues(abilities, new Set<string>(), reserved),
        ).toEqual([
            {
                id: "sampler_target_collision_cycle",
                severity: "error",
                ability: "sampler",
                message: "Sampler target 'cycle' collides with existing state.",
            },
        ]);
    });

    it("filters out an entry whose target resolves to empty (Boolean filter)", () => {
        const abilities = {
            sampler: [{ source: "", target: "   " }],
        } as unknown as EditorAbilities;

        // Empty source + whitespace target -> "" after trim -> filtered out, so no
        // targets exist and no issues are produced.
        expect(
            buildSamplerTargetIssues(abilities, new Set(["cycle"]), reserved),
        ).toEqual([]);
    });

    it("handles a missing source (optional chaining) by falling back to target", () => {
        const abilities = {
            sampler: [{ target: "physics" }],
        } as unknown as EditorAbilities;

        // No `source` field at all -> entry.source?.trim() is undefined -> "" ->
        // falls back to entry.target "physics", which is reserved -> collision.
        expect(
            buildSamplerTargetIssues(abilities, new Set<string>(), reserved),
        ).toEqual([
            {
                id: "sampler_target_collision_physics",
                severity: "error",
                ability: "sampler",
                message:
                    "Sampler target 'physics' collides with existing state.",
            },
        ]);
    });

    it("does not flag a non-reserved, non-state target as a collision", () => {
        const abilities = {
            sampler: [{ source: "", target: "sampled_unique" }],
        } as unknown as EditorAbilities;

        expect(
            buildSamplerTargetIssues(
                abilities,
                new Set(["unrelated"]),
                reserved,
            ),
        ).toEqual([]);
    });
});
