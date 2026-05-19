import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { LOGIC_STEP_MS } from "../../../../../engine/runtime/runtimeConstants";
import { readNumericValue } from "../ability-display/abilityDisplay.utils";
import { resolveEntityDisplay } from "../selectionUtils";
import type { Runtime } from "../../../../../engine/runtime/Runtime";

type CycleBar = { key?: string; max?: number; maxKey?: string };
type PowerDemand = { body?: unknown; mind?: unknown; social?: unknown };

const findCycleBar = (entity: RuntimeEntity, runtime: Runtime | null) => {
    const display = resolveEntityDisplay(entity, runtime) as
        | { bars?: unknown[] }
        | undefined;
    const bars = display?.bars;
    if (!Array.isArray(bars)) return null;
    return (
        (bars as CycleBar[]).find((bar) => bar.key === "state.cycle") ?? null
    );
};

const sumDemand = (demand?: PowerDemand) =>
    [demand?.body, demand?.mind, demand?.social]
        .filter(
            (value): value is number =>
                typeof value === "number" && Number.isFinite(value),
        )
        .reduce((sum, value) => sum + value, 0);

const resolveTickDelta = (entity: RuntimeEntity) => {
    const sink = (
        entity as {
            powerSink?: {
                allocatedDraw?: Record<string, unknown>;
                baseDemand?: PowerDemand;
                maxDemand?: PowerDemand;
            };
        }
    ).powerSink;
    const cycleActive = readNumericValue(entity, "state.cycle_active.value");
    const activeDemand = sink?.baseDemand ?? sink?.maxDemand;
    if (cycleActive === 0) return 0;
    if (activeDemand && sumDemand(activeDemand) <= 0) return 0;
    const draw = sink?.allocatedDraw;
    const total = ["body", "mind", "social"]
        .map((key) => draw?.[key])
        .filter(
            (value): value is number =>
                typeof value === "number" && Number.isFinite(value),
        )
        .reduce((sum, value) => sum + value, 0);
    return total * (LOGIC_STEP_MS / 1000);
};

export type JobCycleBinding =
    | { valuePath: string; maxPath: string }
    | { valuePath: string; maxValue: number };

export const resolveJobCycleBinding = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): JobCycleBinding | null => {
    const bar = findCycleBar(entity, runtime);
    if (!bar) return null;
    if (typeof bar.max === "number") {
        return { valuePath: "state.cycle.value", maxValue: bar.max };
    }
    return {
        valuePath: "state.cycle.value",
        maxPath:
            typeof bar.maxKey === "string" ? bar.maxKey : "state.cycle.max",
    };
};

export const resolveJobCycleStatus = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
) => {
    const binding = resolveJobCycleBinding(entity, runtime);
    const cycleCurrent = readNumericValue(entity, "state.cycle.value");
    const maxPath =
        binding && "maxPath" in binding ? binding.maxPath : "state.cycle.max";
    const cycleMax =
        binding && "maxValue" in binding
            ? binding.maxValue
            : readNumericValue(entity, maxPath);
    const deltaPerTick = resolveTickDelta(entity);
    const ticksRemaining =
        cycleCurrent === null || cycleMax === null || deltaPerTick <= 0
            ? null
            : Math.max(0, (cycleMax - cycleCurrent) / deltaPerTick);
    return { cycleCurrent, cycleMax, ticksRemaining };
};
