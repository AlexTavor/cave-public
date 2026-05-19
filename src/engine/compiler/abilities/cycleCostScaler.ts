import type { Blueprint } from "../../../data/schemas/blueprint";
import { Op } from "../../../data/schemas/primitives";

/**
 * Compiles the per-cycle cost multiplier for cycle abilities.
 *
 * Formula: effective_max = scaled_base * cycle_count * costMultPerCycle
 *
 * Creates `cycle_count` state (starting at 1) and passive effects that
 * multiply `cycle.max` by (cycle_count * costMultPerCycle) each tick.
 * `vals_cycle_cost_scaler` is initialised to `costMultPerCycle` so the
 * very first tick sees the correct multiplier before the first commit.
 */
export const compileCycleCostScaler = (
    draft: Blueprint,
    costMultPerCycle: number,
): void => {
    const components = (draft.components ??= {} as Blueprint["components"]);
    components.state ??= {};
    components.state.cycle_count = { value: 1, visible: false };

    const effects = (components.passiveEffects ??= []);
    const tempKey = "vals_cycle_cost_scaler";
    components.state[tempKey] = { value: costMultPerCycle, visible: false };

    effects.push(
        {
            op: Op.SET,
            target: `self.state.${tempKey}`,
            source: "self.state.cycle_count",
        },
        {
            op: Op.MULT,
            target: `self.state.${tempKey}`,
            value: costMultPerCycle,
        },
        {
            op: Op.MULT,
            target: "self.state.cycle.max",
            source: `self.state.${tempKey}`,
        },
    );
};
