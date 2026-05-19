import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { JobAnalysisResult } from "./jobAnalysis.types";
import { resolveJobCycleStatus } from "./jobAnalysis.cycle";
import { resolveNextCycleGroups } from "./jobAnalysis.rules";

export type { JobAnalysisResult } from "./jobAnalysis.types";

export const analyzeJobStatus = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): JobAnalysisResult => ({
    ...resolveJobCycleStatus(entity, runtime),
    nextCycleGroups: resolveNextCycleGroups(entity, runtime),
});

