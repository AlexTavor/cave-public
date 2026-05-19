import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import {
    resolveJobCycleBinding,
    resolveJobCycleStatus,
} from "../selection/job-card/jobAnalysis.cycle";
import { resolvePowerSink } from "../selection/selectionUtils";
import { resolveNodeOverlayThrottle } from "./resolveNodeOverlayThrottle";
import {
    buildCycleBar,
    resolveWaitingResource,
} from "./resolveCycleOverlayEntry.helpers";
import type { ResolvedNodeOverlayEntry } from "./nodeOverlayTypes";

export const resolveCycleOverlayEntry = (
    entity: RuntimeEntity,
    entityId: string,
    runtime: Runtime | null,
    entityById?: Map<string, RuntimeEntity>,
    showValues = true,
): ResolvedNodeOverlayEntry | null => {
    const binding = resolveJobCycleBinding(entity, runtime);
    if (!binding) return null;
    const waiting =
        resolveNodeOverlayThrottle(entity, runtime, entityById) > 0
            ? resolveWaitingResource(entity)
            : null;
    if (waiting) {
        const base = {
            entityId,
            kind: "cycle" as const,
            label: waiting.label,
            bar: {
                id: `node-overlay:cycle:${entityId}:${waiting.resource}`,
                entityId,
                valuePath: waiting.valuePath,
                maxPath: waiting.maxPath,
                current: waiting.current,
                max: waiting.max,
                color: waiting.color,
            },
        };
        if (!showValues) return base;
        return {
            ...base,
            valueBinding: {
                id: `node-overlay:text:cycle:${entityId}:${waiting.resource}`,
                entityId,
                kind: "compact-fraction",
                valuePath: waiting.valuePath,
                maxPath: waiting.maxPath,
            },
        };
    }
    const { cycleCurrent, cycleMax, ticksRemaining } = resolveJobCycleStatus(
        entity,
        runtime,
    );
    const base = {
        entityId,
        kind: "cycle" as const,
        label: "",
        bar: buildCycleBar(entityId, cycleCurrent, cycleMax, binding),
    };
    if (!showValues) return ticksRemaining === null ? null : base;
    if (ticksRemaining === null) {
        const valueText =
            resolvePowerSink(entity)?.status === "blackout"
                ? "No power"
                : "Idle";
        return { ...base, valueText };
    }
    return {
        ...base,
        valueBinding: {
            id: `node-overlay:text:cycle:${entityId}`,
            entityId,
            kind: "cycle-countdown" as const,
        },
    };
};
