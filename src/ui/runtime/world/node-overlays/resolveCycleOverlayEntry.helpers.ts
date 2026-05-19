import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { readNumericValue } from "../selection/ability-display/abilityDisplay.utils";
import { resolveJobCycleBinding } from "../selection/job-card/jobAnalysis.cycle";
import type { CompactBarBinding } from "./nodeOverlayTypes";

const WAIT_COLOR = "hsl(36, 85%, 52%)";

export const buildCycleBar = (
    entityId: string,
    current: number | null,
    max: number | null,
    binding: ReturnType<typeof resolveJobCycleBinding>,
): CompactBarBinding | undefined => {
    if (!binding) return undefined;
    return {
        id: `node-overlay:cycle:${entityId}`,
        entityId,
        valuePath: binding.valuePath,
        ...(binding && "maxPath" in binding
            ? { maxPath: binding.maxPath, max: max ?? 1 }
            : { maxValue: binding.maxValue, max: binding?.maxValue ?? 1 }),
        current: current ?? 0,
        color: "hsl(200, 70%, 50%)",
    };
};

export const resolveWaitingResource = (entity: RuntimeEntity) => {
    const state = (entity as { state?: Record<string, unknown> }).state ?? {};
    for (const key of Object.keys(state)) {
        const match =
            /^vals_cycle_cost_total_(.+)$/.exec(key) ??
            /^vals_conv_in_(.+)_\d+_\d+$/.exec(key);
        const resource = match?.[1];
        if (!resource) continue;
        const current = readNumericValue(entity, `state.${resource}.value`);
        const max = readNumericValue(entity, `state.${key}.value`);
        if (current === null || max === null || max <= 0 || current >= max)
            continue;
        return {
            resource,
            current,
            max,
            color: WAIT_COLOR,
            label: `[icon=${resource}] ${resource.replaceAll("_", " ")}`,
            valuePath: `state.${resource}.value`,
            maxPath: `state.${key}.value`,
        };
    }
    return null;
};
