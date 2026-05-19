import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { resolvePowerSink } from "./selectionUtils";
import {
    analyzeJobStatus,
    type JobAnalysisResult,
} from "./job-card/jobAnalysis";

export const selectEfficiency = (entity: RuntimeEntity) => {
    const sink = resolvePowerSink(entity);
    const val = sink?.efficiency;
    return typeof val === "number" && Number.isFinite(val) ? val : 0;
};

export const createJobAnalysisSelector =
    (runtime: Runtime | null) =>
    (entity: RuntimeEntity): JobAnalysisResult =>
        analyzeJobStatus(entity, runtime);

export const analysisComparer = (
    a: JobAnalysisResult | undefined,
    b: JobAnalysisResult | undefined,
) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.ticksRemaining !== b.ticksRemaining) return false;
    if (a.cycleCurrent !== b.cycleCurrent) return false;
    if (a.cycleMax !== b.cycleMax) return false;
    return (
        JSON.stringify(a.nextCycleGroups) === JSON.stringify(b.nextCycleGroups)
    );
};

