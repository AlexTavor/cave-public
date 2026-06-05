import { describe, expect, it } from "vitest";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import {
    normalizeResource,
    buildDuplicateIssues,
    buildUpkeepOrphanIssues,
    buildProductionDependencyIssues,
} from "./collisionDetectorUtils";

const makeAbilities = (over: Partial<EditorAbilities>): EditorAbilities =>
    ({ ...over }) as EditorAbilities;

// A production entry; with no `triggers` it defaults to ["cycle_complete"], so
// requiresCycleAbility() returns true.
const productionRequiringCycle = (): EditorAbilities["production"] =>
    [{ resource: "food" }] as unknown as EditorAbilities["production"];

// A production entry that triggers on something other than cycle_complete, so
// requiresCycleAbility() returns false.
const productionNotRequiringCycle = (): EditorAbilities["production"] =>
    [
        { resource: "food", triggers: ["assignment_complete"] },
    ] as unknown as EditorAbilities["production"];

const cycleAbility = (): EditorAbilities["cycle"] =>
    ({}) as EditorAbilities["cycle"];

describe("normalizeResource", () => {
    it("trims surrounding whitespace", () => {
        expect(normalizeResource("  food  ")).toBe("food");
    });

    it("returns empty string for undefined (?? fallback)", () => {
        expect(normalizeResource(undefined)).toBe("");
    });

    it("returns empty string for a whitespace-only value", () => {
        expect(normalizeResource("   ")).toBe("");
    });

    it("leaves an already-trimmed value unchanged", () => {
        expect(normalizeResource("ore")).toBe("ore");
    });
});

describe("buildDuplicateIssues", () => {
    it("returns no issues when every resource is unique", () => {
        expect(buildDuplicateIssues(["food", "heat", "ore"], "storage")).toEqual(
            [],
        );
    });

    it("returns no issues for an empty list", () => {
        expect(buildDuplicateIssues([], "storage")).toEqual([]);
    });

    it("flags a resource that appears twice (full deep-equal)", () => {
        expect(buildDuplicateIssues(["food", "food"], "storage")).toEqual([
            {
                id: "storage_duplicate_food",
                severity: "error",
                ability: "storage",
                message: "Duplicate storage entries for 'food'.",
            },
        ]);
    });

    it("interpolates the ability label into id, ability, and message", () => {
        expect(buildDuplicateIssues(["ore", "ore"], "upkeep")).toEqual([
            {
                id: "upkeep_duplicate_ore",
                severity: "error",
                ability: "upkeep",
                message: "Duplicate upkeep entries for 'ore'.",
            },
        ]);
    });

    it("skips falsy (empty-string) resources via the continue guard", () => {
        // Two empty strings would collide if counted; the `if (!resource) continue`
        // guard must drop them so no duplicate is reported.
        expect(buildDuplicateIssues(["", "", "food"], "storage")).toEqual([]);
    });

    it("reports a triplicated resource exactly once", () => {
        expect(
            buildDuplicateIssues(["food", "food", "food"], "storage"),
        ).toEqual([
            {
                id: "storage_duplicate_food",
                severity: "error",
                ability: "storage",
                message: "Duplicate storage entries for 'food'.",
            },
        ]);
    });

    it("reports only the duplicated resource, not the unique one", () => {
        expect(
            buildDuplicateIssues(["food", "food", "heat"], "storage"),
        ).toEqual([
            {
                id: "storage_duplicate_food",
                severity: "error",
                ability: "storage",
                message: "Duplicate storage entries for 'food'.",
            },
        ]);
    });
});

describe("buildUpkeepOrphanIssues", () => {
    it("returns no issues when every upkeep resource has matching storage", () => {
        expect(buildUpkeepOrphanIssues(["food", "heat"], ["food"])).toEqual([]);
    });

    it("returns no issues for an empty upkeep list", () => {
        expect(buildUpkeepOrphanIssues(["food"], [])).toEqual([]);
    });

    it("flags an upkeep resource with no storage backing (full deep-equal)", () => {
        expect(buildUpkeepOrphanIssues(["food"], ["heat"])).toEqual([
            {
                id: "upkeep_orphan_heat",
                severity: "warning",
                ability: "upkeep",
                message: "Upkeep requires 'heat' storage.",
            },
        ]);
    });

    it("flags an orphan when storage is empty entirely", () => {
        expect(buildUpkeepOrphanIssues([], ["heat"])).toEqual([
            {
                id: "upkeep_orphan_heat",
                severity: "warning",
                ability: "upkeep",
                message: "Upkeep requires 'heat' storage.",
            },
        ]);
    });

    it("skips empty-string upkeep resources (resource && short-circuit)", () => {
        // The `resource && ...` guard must drop the empty entry before the
        // storageSet membership check, so no orphan issue is produced.
        expect(buildUpkeepOrphanIssues(["food"], [""])).toEqual([]);
    });

    it("does not treat an empty-string storage entry as covering an orphan", () => {
        // storageResources is filtered through Boolean, so the "" never enters the
        // set; the real "heat" upkeep stays orphaned.
        expect(buildUpkeepOrphanIssues([""], ["heat"])).toEqual([
            {
                id: "upkeep_orphan_heat",
                severity: "warning",
                ability: "upkeep",
                message: "Upkeep requires 'heat' storage.",
            },
        ]);
    });

    it("reports only the orphaned resources, preserving order", () => {
        expect(
            buildUpkeepOrphanIssues(["food"], ["food", "heat", "ore"]),
        ).toEqual([
            {
                id: "upkeep_orphan_heat",
                severity: "warning",
                ability: "upkeep",
                message: "Upkeep requires 'heat' storage.",
            },
            {
                id: "upkeep_orphan_ore",
                severity: "warning",
                ability: "upkeep",
                message: "Upkeep requires 'ore' storage.",
            },
        ]);
    });
});

describe("buildProductionDependencyIssues", () => {
    it("flags production that needs a cycle when no cycle ability exists (full deep-equal)", () => {
        const abilities = makeAbilities({
            production: productionRequiringCycle(),
        });

        expect(buildProductionDependencyIssues(abilities)).toEqual([
            {
                id: "production_requires_cycle",
                severity: "error",
                ability: "production",
                message: "Production Ability requires a Cycle Ability to trigger.",
            },
        ]);
    });

    it("returns no issues when a cycle ability is present", () => {
        const abilities = makeAbilities({
            production: productionRequiringCycle(),
            cycle: cycleAbility(),
        });

        expect(buildProductionDependencyIssues(abilities)).toEqual([]);
    });

    it("returns no issues when production does not require a cycle", () => {
        const abilities = makeAbilities({
            production: productionNotRequiringCycle(),
        });

        expect(buildProductionDependencyIssues(abilities)).toEqual([]);
    });

    it("returns no issues when there is no production ability at all", () => {
        expect(buildProductionDependencyIssues(makeAbilities({}))).toEqual([]);
    });
});
