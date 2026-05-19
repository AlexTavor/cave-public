import { formatCompactNumber } from "../../../status/formatters";
import {
    formatCompactFraction,
    formatCountdownText,
    formatDurationMs,
} from "../../selection/ability-display/abilityDisplay.utils";
import { resolveJobCycleStatus } from "../../selection/job-card/jobAnalysis.cycle";
import { resolvePowerSink } from "../../selection/selectionUtils";
import { readRuntimeEntity } from "../entityStateLinkRuntime.helpers";
import { resolveNumericValue } from "../pathResolvers";
import type { InternalTextBinding, RuntimeLike } from "./bindingTypes";

const formatNumericText = (
    binding: Extract<InternalTextBinding, { kind: "numeric-text" }>,
    entity: any,
) => {
    const value = resolveNumericValue(binding.valueResolver?.(entity));
    if (value == null) return binding.fallbackText ?? "";
    const scaled = value * (binding.multiplier ?? 1);
    if (binding.format === "compact-number")
        return `${formatCompactNumber(scaled)}${binding.suffix ?? ""}`;
    if (binding.format === "integer-percent")
        return `${Math.round(scaled)}${binding.suffix ?? "%"}`;
    return `${scaled}${binding.suffix ?? ""}`;
};

export const resolveText = (
    runtime: RuntimeLike,
    binding: InternalTextBinding,
    entity = readRuntimeEntity(
        runtime,
        new Map<string, any>(),
        binding.entityId,
    ),
) => {
    if (!entity)
        return binding.kind === "numeric-text"
            ? (binding.fallbackText ?? "")
            : "";
    if (binding.kind === "cycle-countdown") {
        const { ticksRemaining } = resolveJobCycleStatus(
            entity,
            runtime as any,
        );
        return (
            formatCountdownText(ticksRemaining) ??
            (resolvePowerSink(entity)?.status === "blackout"
                ? "No power"
                : "Idle")
        );
    }
    if (binding.kind === "numeric-text")
        return formatNumericText(binding, entity);
    const current = resolveNumericValue(binding.valueResolver?.(entity)) ?? 0;
    if (binding.kind === "remaining-duration-ms") {
        const duration =
            resolveNumericValue(binding.maxResolver?.(entity)) ?? 0;
        return formatDurationMs(Math.max(duration - current, 0) * 1000) ?? "";
    }
    const max =
        resolveNumericValue(binding.maxResolver?.(entity)) ??
        binding.maxValue ??
        Math.max(current, 1);
    return formatCompactFraction(current, max);
};
