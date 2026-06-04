import { describe, expect, it } from "vitest";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { ConversionAbilityConfig } from "../../../data/schemas/abilities/conversion";
import { buildCycleCollisionIssues } from "./cycleConversionCollisionUtils";

const makeAbilities = (over: Partial<EditorAbilities>): EditorAbilities =>
    ({ ...over }) as EditorAbilities;

const cycleAbility = (): EditorAbilities["cycle"] =>
    ({}) as EditorAbilities["cycle"];

// Only `resetCycle` is read by the collision util; other fields are irrelevant.
const conversion = (
    over: Partial<ConversionAbilityConfig> = {},
): ConversionAbilityConfig =>
    ({ id: "conv", ...over }) as ConversionAbilityConfig;

const COLLISION_ISSUE = {
    id: "cycle_state_collision",
    severity: "error",
    ability: "cycle",
    message: "Cycle and Conversion both write to state.cycle.",
};

describe("buildCycleCollisionIssues", () => {
    it("returns no issues when there is no cycle ability (even with a resetting conversion)", () => {
        const abilities = makeAbilities({
            conversion: [conversion({ resetCycle: true })],
        });

        expect(buildCycleCollisionIssues(abilities)).toEqual([]);
    });

    it("returns no issues when the conversion ability is absent", () => {
        // abilities.conversion is undefined -> the `?? []` fallback yields length 0.
        const abilities = makeAbilities({ cycle: cycleAbility() });

        expect(buildCycleCollisionIssues(abilities)).toEqual([]);
    });

    it("returns no issues when the conversion array is present but empty", () => {
        const abilities = makeAbilities({
            cycle: cycleAbility(),
            conversion: [],
        });

        expect(buildCycleCollisionIssues(abilities)).toEqual([]);
    });

    it("returns no issues for a fully empty abilities object", () => {
        expect(buildCycleCollisionIssues(makeAbilities({}))).toEqual([]);
    });

    it("flags a collision when cycle plus a resetCycle:true conversion coexist (full deep-equal)", () => {
        const abilities = makeAbilities({
            cycle: cycleAbility(),
            conversion: [conversion({ resetCycle: true })],
        });

        expect(buildCycleCollisionIssues(abilities)).toEqual([COLLISION_ISSUE]);
    });

    it("treats a conversion with omitted resetCycle as resetting (!== false), so it collides", () => {
        // resetCycle undefined -> `undefined !== false` is true -> hasReset true.
        const abilities = makeAbilities({
            cycle: cycleAbility(),
            conversion: [conversion({})],
        });

        expect(buildCycleCollisionIssues(abilities)).toEqual([COLLISION_ISSUE]);
    });

    it("returns no issues when every conversion has resetCycle:false", () => {
        // hasReset is false -> the `if (!hasReset) return []` branch fires.
        const abilities = makeAbilities({
            cycle: cycleAbility(),
            conversion: [
                conversion({ resetCycle: false }),
                conversion({ id: "conv2", resetCycle: false }),
            ],
        });

        expect(buildCycleCollisionIssues(abilities)).toEqual([]);
    });

    it("flags a collision if at least one of several conversions resets the cycle", () => {
        const abilities = makeAbilities({
            cycle: cycleAbility(),
            conversion: [
                conversion({ id: "conv1", resetCycle: false }),
                conversion({ id: "conv2", resetCycle: true }),
            ],
        });

        expect(buildCycleCollisionIssues(abilities)).toEqual([COLLISION_ISSUE]);
    });
});
