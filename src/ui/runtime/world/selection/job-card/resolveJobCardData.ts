import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { readAssignmentDuration } from "../../../../../game/assignment/bodyAssignment";
import { isProcessingAssignmentNode } from "../../../../../game/assignment/assignmentNodeKinds";
import { resolveStorageAbilityBars } from "../ability-display/resolveStorageAbilityBars";
import { resolveAssignmentRequirementsData } from "../absorption/assignmentRequirementsData";
import { resolveAssignmentSlots } from "../absorption/resolveAssignmentSlots";
import { isConditionalActivationTargetInactive } from "../components/isConditionalActivationTargetInactive";
import { analyzeEntityState } from "../entityAnalysis/entityAnalysis";
import { readTraitIndex } from "../selectionResolverRuntime";
import {
    resolvePowerSink,
    resolveVisibleEntityLabel,
    resolveVisibleEntityDescription,
} from "../selectionUtils";
import { selectEfficiency } from "../jobCardSelectors";
import { analyzeJobStatus } from "./jobAnalysis";
import type { JobCardData } from "./jobCardTypes";
import { resolveSuspiciousActivityIndicator } from "./resolveSuspiciousActivityIndicator";

const BODY_SELECTOR_FACT_ABOUT = "world";

export const resolveJobCardData = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): JobCardData | null => {
    const suspiciousActivity = resolveSuspiciousActivityIndicator(
        entity,
        runtime,
    );
    if (isProcessingAssignmentNode(entity)) {
        const liveEntity = runtime?.getEntity(entity.id ?? "") ?? entity;
        const assignedIds = (liveEntity as any).assignment?.assignedIds ?? [];
        const isDepleted = (entity as any).state?.is_depleted?.value === 1;
        const slotCount = runtime
            ? resolveAssignmentSlots(runtime, liveEntity, entity)
            : Number.POSITIVE_INFINITY;
        return {
            variant: "assignment",
            label: resolveVisibleEntityLabel(entity, runtime),
            description: resolveVisibleEntityDescription(entity, runtime),
            assignedIds,
            duration: readAssignmentDuration(entity) || 100,
            isSelectorOpen:
                Number(
                    (runtime?.getEntity("sys_world") as any)?.run
                        ?.body_selector_open?.[BODY_SELECTOR_FACT_ABOUT],
                ) > 0,
            canAssignMoreBodies: assignedIds.length < slotCount,
            isDepleted,
            isInactive: isConditionalActivationTargetInactive(
                entity.id ?? "",
                runtime,
                { ability: "assignment" },
            ),
            requirements: resolveAssignmentRequirementsData(
                entity,
                assignedIds,
                (id) => runtime?.getEntity(id),
            ),
            storageModels: resolveStorageAbilityBars(entity, runtime),
            suspiciousActivity,
        };
    }
    const sink = resolvePowerSink(entity);
    if (!sink) return null;
    const traits = analyzeEntityState(entity, readTraitIndex(runtime)).traits;
    return {
        variant: "job",
        label: resolveVisibleEntityLabel(entity, runtime),
        description: resolveVisibleEntityDescription(entity, runtime),
        sink,
        liveEfficiency: selectEfficiency(entity),
        analysis: analyzeJobStatus(entity, runtime),
        storageModels: resolveStorageAbilityBars(entity, runtime),
        traits,
        suspiciousActivity,
    };
};
