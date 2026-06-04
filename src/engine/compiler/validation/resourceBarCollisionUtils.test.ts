import { describe, expect, it } from "vitest";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import type { CycleResourceCostConfig } from "../../../data/schemas/abilities/cycle";
import {
    buildMissingResourceBarPositionIssues,
    buildResourceBarPositionCollisionIssues,
} from "./resourceBarCollisionUtils";

// `EditorAbilities` is a z.input type: defaulted fields are optional, so each
// helper only sets the fields the collision utils actually read (resource,
// barPosition, visible). Casts are confined to these factories.
const makeStorage = (
    over: Partial<StorageAbilityConfig> = {},
): StorageAbilityConfig =>
    ({
        resource: "food",
        ...over,
    }) as StorageAbilityConfig;

const makeCycleCost = (
    over: Partial<CycleResourceCostConfig> = {},
): CycleResourceCostConfig =>
    ({
        resource: "food",
        ...over,
    }) as CycleResourceCostConfig;

const makeAbilities = (over: Partial<EditorAbilities>): EditorAbilities =>
    ({ ...over }) as EditorAbilities;

describe("buildMissingResourceBarPositionIssues", () => {
    it("returns no issues when every visible entry has a barPosition", () => {
        const abilities = makeAbilities({
            storage: [makeStorage({ resource: "food", barPosition: "top_left" })],
            cycle: {
                resourceCosts: [
                    makeCycleCost({ resource: "heat", barPosition: "top_right" }),
                ],
            } as EditorAbilities["cycle"],
        });

        expect(buildMissingResourceBarPositionIssues(abilities)).toEqual([]);
    });

    it("returns no issues for an empty abilities object", () => {
        expect(buildMissingResourceBarPositionIssues(makeAbilities({}))).toEqual(
            [],
        );
    });

    it("flags a visible storage entry that omits barPosition (full deep-equal)", () => {
        const abilities = makeAbilities({
            storage: [makeStorage({ resource: "food" })],
        });

        expect(buildMissingResourceBarPositionIssues(abilities)).toEqual([
            {
                id: "storage_resource_bar_position_missing_food",
                severity: "error",
                ability: "storage",
                message:
                    "storage resource 'food' requires barPosition when visible.",
            },
        ]);
    });

    it("flags a visible cycle resourceCost entry that omits barPosition (full deep-equal)", () => {
        const abilities = makeAbilities({
            cycle: {
                resourceCosts: [makeCycleCost({ resource: "ore" })],
            } as EditorAbilities["cycle"],
        });

        expect(buildMissingResourceBarPositionIssues(abilities)).toEqual([
            {
                id: "cycle_resource_bar_position_missing_ore",
                severity: "error",
                ability: "cycle",
                message: "cycle resource 'ore' requires barPosition when visible.",
            },
        ]);
    });

    it("ignores entries hidden via visible:false (no issue even without barPosition)", () => {
        const abilities = makeAbilities({
            storage: [makeStorage({ resource: "food", visible: false })],
            cycle: {
                resourceCosts: [
                    makeCycleCost({ resource: "ore", visible: false }),
                ],
            } as EditorAbilities["cycle"],
        });

        expect(buildMissingResourceBarPositionIssues(abilities)).toEqual([]);
    });

    it("emits storage and cycle issues together, storage entries first", () => {
        const abilities = makeAbilities({
            storage: [makeStorage({ resource: "food" })],
            cycle: {
                resourceCosts: [makeCycleCost({ resource: "ore" })],
            } as EditorAbilities["cycle"],
        });

        expect(buildMissingResourceBarPositionIssues(abilities)).toEqual([
            {
                id: "storage_resource_bar_position_missing_food",
                severity: "error",
                ability: "storage",
                message:
                    "storage resource 'food' requires barPosition when visible.",
            },
            {
                id: "cycle_resource_bar_position_missing_ore",
                severity: "error",
                ability: "cycle",
                message: "cycle resource 'ore' requires barPosition when visible.",
            },
        ]);
    });

    it("normalizes the resource: trims whitespace and treats undefined as empty string", () => {
        const abilities = makeAbilities({
            storage: [
                makeStorage({
                    resource: "  food  " as unknown as string,
                }),
            ],
            cycle: {
                resourceCosts: [
                    makeCycleCost({
                        resource: undefined as unknown as string,
                    }),
                ],
            } as EditorAbilities["cycle"],
        });

        const issues = buildMissingResourceBarPositionIssues(abilities);
        // trim() must run (drops surrounding spaces) and the ?? "" fallback must
        // fire for the undefined cycle resource.
        expect(issues).toEqual([
            {
                id: "storage_resource_bar_position_missing_food",
                severity: "error",
                ability: "storage",
                message:
                    "storage resource 'food' requires barPosition when visible.",
            },
            {
                id: "cycle_resource_bar_position_missing_",
                severity: "error",
                ability: "cycle",
                message: "cycle resource '' requires barPosition when visible.",
            },
        ]);
    });
});

describe("buildResourceBarPositionCollisionIssues", () => {
    it("returns no issues when all visible barPositions are distinct", () => {
        const abilities = makeAbilities({
            storage: [
                makeStorage({ resource: "food", barPosition: "top_left" }),
                makeStorage({ resource: "heat", barPosition: "top_right" }),
            ],
            cycle: {
                resourceCosts: [
                    makeCycleCost({ resource: "ore", barPosition: "bottom_left" }),
                ],
            } as EditorAbilities["cycle"],
        });

        expect(buildResourceBarPositionCollisionIssues(abilities)).toEqual([]);
    });

    it("returns no issues for an empty abilities object", () => {
        expect(
            buildResourceBarPositionCollisionIssues(makeAbilities({})),
        ).toEqual([]);
    });

    it("returns no issues when no visible entry declares a barPosition", () => {
        // Every entry hits the `if (!entry.position) return` guard, so the count
        // map stays empty and no duplicate is reported.
        const abilities = makeAbilities({
            storage: [makeStorage({ resource: "food" })],
            cycle: {
                resourceCosts: [makeCycleCost({ resource: "ore" })],
            } as EditorAbilities["cycle"],
        });

        expect(buildResourceBarPositionCollisionIssues(abilities)).toEqual([]);
    });

    it("flags a barPosition used twice across storage and cycle (full deep-equal)", () => {
        const abilities = makeAbilities({
            storage: [makeStorage({ resource: "food", barPosition: "top_left" })],
            cycle: {
                resourceCosts: [
                    makeCycleCost({ resource: "ore", barPosition: "top_left" }),
                ],
            } as EditorAbilities["cycle"],
        });

        expect(buildResourceBarPositionCollisionIssues(abilities)).toEqual([
            {
                id: "resource_bar_position_duplicate_top_left",
                severity: "error",
                ability: "display",
                message: "Duplicate visible resource bar position 'top_left'.",
            },
        ]);
    });

    it("does not count hidden entries toward a collision", () => {
        // One visible + one hidden at the same slot => count of 1 => no issue.
        const abilities = makeAbilities({
            storage: [
                makeStorage({ resource: "food", barPosition: "top_left" }),
                makeStorage({
                    resource: "heat",
                    barPosition: "top_left",
                    visible: false,
                }),
            ],
        });

        expect(buildResourceBarPositionCollisionIssues(abilities)).toEqual([]);
    });

    it("reports each duplicated slot exactly once even with three entries", () => {
        const abilities = makeAbilities({
            storage: [
                makeStorage({ resource: "a", barPosition: "top_left" }),
                makeStorage({ resource: "b", barPosition: "top_left" }),
                makeStorage({ resource: "c", barPosition: "top_left" }),
            ],
        });

        expect(buildResourceBarPositionCollisionIssues(abilities)).toEqual([
            {
                id: "resource_bar_position_duplicate_top_left",
                severity: "error",
                ability: "display",
                message: "Duplicate visible resource bar position 'top_left'.",
            },
        ]);
    });

    it("ignores a barPosition used once even when others collide", () => {
        const abilities = makeAbilities({
            storage: [
                makeStorage({ resource: "a", barPosition: "top_left" }),
                makeStorage({ resource: "b", barPosition: "top_left" }),
                makeStorage({ resource: "c", barPosition: "top_right" }),
            ],
        });

        expect(buildResourceBarPositionCollisionIssues(abilities)).toEqual([
            {
                id: "resource_bar_position_duplicate_top_left",
                severity: "error",
                ability: "display",
                message: "Duplicate visible resource bar position 'top_left'.",
            },
        ]);
    });
});
