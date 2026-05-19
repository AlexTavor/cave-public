import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { resolveAssignmentRequirementsData } from "../absorption/assignmentRequirementsData";
import type { EntityTraitSummary } from "../entityAnalysis/entityAnalysis.types";
import type { JobAnalysisResult } from "./jobAnalysis";
import type { resolveStorageAbilityBars } from "../ability-display/resolveStorageAbilityBars";
import type { resolvePowerSink } from "../selectionUtils";
import type { SuspiciousActivityIndicatorModel } from "./resolveSuspiciousActivityIndicator";

export type AssignmentJobCardData = {
    variant: "assignment";
    label: string;
    description: string;
    assignedIds: string[];
    duration: number;
    isSelectorOpen: boolean;
    canAssignMoreBodies?: boolean;
    isDepleted: boolean;
    isInactive?: boolean;
    requirements: ReturnType<typeof resolveAssignmentRequirementsData>;
    storageModels: ReturnType<typeof resolveStorageAbilityBars>;
    suspiciousActivity?: SuspiciousActivityIndicatorModel | null;
};

export type PowerJobCardData = {
    variant: "job";
    label: string;
    description: string;
    sink: NonNullable<ReturnType<typeof resolvePowerSink>>;
    liveEfficiency: number;
    analysis: JobAnalysisResult;
    storageModels: ReturnType<typeof resolveStorageAbilityBars>;
    traits: EntityTraitSummary[];
    suspiciousActivity?: SuspiciousActivityIndicatorModel | null;
};

export type JobCardData = AssignmentJobCardData | PowerJobCardData;
export type JobCardEntity = RuntimeEntity;
