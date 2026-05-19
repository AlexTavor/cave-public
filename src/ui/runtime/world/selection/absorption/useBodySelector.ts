import { useMemo, useState, type MouseEvent } from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { readAssignedIds } from "../../../../../game/assignment/bodyAssignment";
import { resolveAssignmentRequirementsData } from "./assignmentRequirementsData";
import { resolveAssignmentSlots } from "./resolveAssignmentSlots";
import { resolveAbsorptionPreview } from "./resolveAbsorptionPreview";
import { useBodySelectorCandidateIds } from "./useBodySelectorCandidateIds";

const readEntityId = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    const row =
        target instanceof Element ? target.closest("[data-entity-id]") : null;
    return row instanceof HTMLElement ? row.dataset.entityId : undefined;
};

type StationEntity = RuntimeEntity & {
    assignment?: { slots?: number };
};

export const useBodySelector = (
    runtime: Runtime,
    stationEntity?: RuntimeEntity,
) => {
    const stationEntityId = stationEntity?.id;
    const candidateIds = useBodySelectorCandidateIds(runtime, stationEntityId);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        () => new Set(),
    );
    const [isDragging, setIsDragging] = useState(false);
    const [dragTargetState, setDragTargetState] = useState(false);
    const currentStationEntity = ((stationEntityId
        ? runtime.getEntity(stationEntityId)
        : null) ?? stationEntity) as StationEntity | undefined;
    const remainingSlots = Math.max(
        0,
        resolveAssignmentSlots(runtime, currentStationEntity, stationEntity) -
            readAssignedIds(currentStationEntity).length,
    );
    const selectedIdList = useMemo(
        () => Array.from(selectedIds),
        [selectedIds],
    );

    const preview = useMemo(() => {
        const bodyEntities = selectedIdList
            .map((id) => runtime.getEntity(id))
            .filter((entity): entity is RuntimeEntity => !!entity);
        return resolveAbsorptionPreview({
            runtime,
            stationEntity: currentStationEntity,
            bodyEntities,
        });
    }, [currentStationEntity, runtime, selectedIdList]);

    const requirements = useMemo(
        () =>
            resolveAssignmentRequirementsData(
                currentStationEntity,
                selectedIdList,
                (id) => runtime.getEntity(id) ?? undefined,
            ),
        [currentStationEntity, runtime, selectedIdList],
    );
    const canConfirm = selectedIdList.length > 0;

    const updateSelection = (id: string, shouldSelect: boolean) => {
        setSelectedIds((prev) => {
            if (prev.has(id) === shouldSelect) return prev;
            if (shouldSelect && prev.size >= remainingSlots) return prev;
            const next = new Set(prev);
            if (shouldSelect) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const onListMouseDown = (event: MouseEvent<HTMLElement>) => {
        const id = readEntityId(event);
        if (!id) return;
        const shouldSelect = !selectedIds.has(id);
        setDragTargetState(shouldSelect);
        setIsDragging(true);
        updateSelection(id, shouldSelect);
    };

    const onListMouseOver = (event: MouseEvent<HTMLElement>) => {
        if (!isDragging) return;
        const id = readEntityId(event);
        if (!id) return;
        updateSelection(id, dragTargetState);
    };

    const onListMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
    };

    return {
        candidateIds,
        selectedIds,
        onListMouseDown,
        onListMouseOver,
        onListMouseUp,
        canConfirm,
        preview,
        requirements,
    };
};

