import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { CaveMindMemory } from "../../../data/schemas/game/caveMind";
import { resolveAssignmentOwnerKind } from "../../assignment/assignmentNodeKinds";
import {
    hasTag,
    readStateBool,
    readStateNumber,
    readTraitIds,
} from "./caveMindReadUtils";

type Totals = {
    explorationCuriosityEntityIds: Set<string>;
    assignedNodeCuriosityEntityIds: Set<string>;
    firstCycleCuriosityEntityIds: Set<string>;
};

export const collectCaveCandidate = (
    snapshot: Snapshot,
    entity: any,
    memory: CaveMindMemory,
    selectedEntityId: string,
    dragEntityId: string,
    dragActive: boolean,
    totals: Totals,
) => {
    if (!entity.id || entity.id === "sys_world") return null;
    const body = snapshot.getPhysicsBody(entity.id);
    if (!body) return null;
    const assignedCount = Array.isArray(entity.assignment?.assignedIds)
        ? entity.assignment.assignedIds.length
        : 0;
    const assignmentOwnerKind = resolveAssignmentOwnerKind(entity);
    const assignmentAttentionEligible =
        assignmentOwnerKind === "power" || assignmentOwnerKind === "processing";
    const cycleValue = readStateNumber(entity, "cycle");
    const cycleMax = entity.state?.cycle?.max ?? 0;
    const cycleActive =
        readStateBool(entity, "cycle_active") ||
        (cycleMax > 0 && cycleValue < cycleMax);
    const explorationTagged = hasTag(entity, "cave_exploration");
    if (explorationTagged && cycleActive) {
        totals.explorationCuriosityEntityIds.add(entity.id);
    }
    if (assignmentAttentionEligible && assignedCount > 0) {
        totals.assignedNodeCuriosityEntityIds.add(entity.id);
    }
    if (cycleActive && !memory.entities[entity.id]?.seenActiveCycle) {
        totals.firstCycleCuriosityEntityIds.add(entity.id);
    }
    return {
        entityId: entity.id,
        worldX: body.position.x,
        worldY: body.position.y,
        tags: Array.isArray(entity.tags) ? entity.tags : [],
        assignedCount,
        assignmentAttentionEligible,
        absorptionProgress: 0,
        absorptionMax: 0,
        cycleValue,
        cycleMax,
        cycleActive,
        selected: entity.id === selectedEntityId,
        dragged: dragActive && entity.id === dragEntityId,
        explorationTagged,
        traitIds: readTraitIds(entity),
    };
};
