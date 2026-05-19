import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { filterAssignableBodies } from "../../../../game/assignment/assignmentAcceptance";
import { readAssignedIds } from "../../../../game/assignment/bodyAssignment";
import { resolveAssignmentRequirementsData } from "../selection/absorption/assignmentRequirementsData";
import { resolveAssignmentSlots } from "../selection/absorption/resolveAssignmentSlots";
import { resolvePointerSelectorPreview } from "./resolvePointerSelectorPreview";

const readEntityId = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    const row =
        target instanceof Element ? target.closest("[data-entity-id]") : null;
    return row instanceof HTMLElement ? row.dataset.entityId : undefined;
};

const computeRemainingSlots = (
    runtime: Runtime | null,
    targetEntity: RuntimeEntity | undefined,
): number => {
    if (!runtime || !targetEntity) return Number.POSITIVE_INFINITY;
    return Math.max(
        0,
        resolveAssignmentSlots(runtime, targetEntity, targetEntity) -
            readAssignedIds(targetEntity).length,
    );
};

const computeValidCandidateIds = (
    runtime: Runtime | null,
    remainingSlots: number,
    candidateIds: string[],
    targetEntity: RuntimeEntity | undefined,
): string[] => {
    if (!runtime || remainingSlots === 0) return [];
    const bodies = candidateIds.flatMap((id) => {
        const entity = runtime.getEntity(id);
        return entity ? [entity] : [];
    });
    const validBodies = targetEntity
        ? filterAssignableBodies({ bodies, owner: targetEntity })
        : bodies;
    return validBodies.map((entity) => entity.id ?? "");
};

const computePreview = (
    runtime: Runtime | null,
    selectedIdList: string[],
    targetEntity: RuntimeEntity | undefined,
    targetKind: string,
) => {
    const bodyEntities = runtime
        ? selectedIdList.flatMap((id) => {
              const entity = runtime.getEntity(id);
              return entity ? [entity] : [];
          })
        : [];
    return runtime
        ? resolvePointerSelectorPreview({
              runtime,
              targetEntity,
              targetKind,
              bodyEntities,
          })
        : null;
};

const computeRequirements = (
    targetEntity: RuntimeEntity | undefined,
    selectedIdList: string[],
    runtime: Runtime | null,
) =>
    resolveAssignmentRequirementsData(
        targetEntity,
        selectedIdList,
        (id) => runtime?.getEntity(id) ?? undefined,
    );

export const usePointerBodySelector = (
    runtime: Runtime | null,
    candidateIds: string[],
    targetKind: string,
    targetEntity?: RuntimeEntity,
) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        () => new Set(),
    );
    const [isDragging, setIsDragging] = useState(false);
    const [dragTargetState, setDragTargetState] = useState(false);
    const remainingSlots = useMemo(
        () => computeRemainingSlots(runtime, targetEntity),
        [runtime, targetEntity],
    );
    const validCandidateIds = useMemo(
        () => computeValidCandidateIds(runtime, remainingSlots, candidateIds, targetEntity),
        [candidateIds, remainingSlots, runtime, targetEntity],
    );
    const selectedIdList = useMemo(
        () => Array.from(selectedIds),
        [selectedIds],
    );

    useEffect(() => {
        setSelectedIds((prev) => {
            const next = [...prev].filter((id) =>
                validCandidateIds.includes(id),
            );
            if (next.length > remainingSlots) next.length = remainingSlots;
            return next.length === prev.size && next.every((id) => prev.has(id))
                ? prev
                : new Set(next);
        });
    }, [remainingSlots, validCandidateIds]);

    const preview = useMemo(
        () => computePreview(runtime, selectedIdList, targetEntity, targetKind),
        [runtime, selectedIdList, targetEntity, targetKind],
    );
    const requirements = useMemo(
        () => computeRequirements(targetEntity, selectedIdList, runtime),
        [runtime, selectedIdList, targetEntity],
    );
    const canConfirm = selectedIdList.length > 0;
    const updateSelection = (id: string, shouldSelect: boolean) => {
        setSelectedIds((prev) => {
            if (prev.has(id) === shouldSelect) return prev;
            if (!validCandidateIds.includes(id)) return prev;
            if (shouldSelect && prev.size >= remainingSlots) return prev;
            const next = new Set(prev);
            if (shouldSelect) next.add(id);
            else next.delete(id);
            return next;
        });
    };
    return {
        candidateIds: validCandidateIds,
        selectedIds,
        canConfirm,
        preview: preview?.preview ?? null,
        showExpectedRewards: preview?.showExpectedRewards ?? false,
        requirements,
        onListMouseDown: (event: MouseEvent<HTMLElement>) => {
            const id = readEntityId(event);
            if (!id) return;
            const shouldSelect = !selectedIds.has(id);
            setDragTargetState(shouldSelect);
            setIsDragging(true);
            updateSelection(id, shouldSelect);
        },
        onListMouseOver: (event: MouseEvent<HTMLElement>) => {
            if (!isDragging) return;
            const id = readEntityId(event);
            if (id) updateSelection(id, dragTargetState);
        },
        onListMouseUp: () => setIsDragging(false),
    };
};
