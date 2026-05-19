import { useEffect, useRef } from "react";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useRuntimeRevisionToken } from "../hooks/useRuntimeRevisionToken";
import { useRuntimeSelector } from "../hooks/useRuntimeSelector";
import { resolveSelectionLens } from "./selection/selectionLensMap";
import { useWorldInteraction } from "./context/WorldInteractionContext";

interface SelectedEntityActions {
    runtime: ReturnType<typeof useWorldInteraction>["runtime"];
    entity: RuntimeEntity | null;
    selectedId: string | null;
    deselect: () => void;
    killSelected: () => void;
}

export const useSelectedEntity = (): SelectedEntityActions => {
    const {
        runtime,
        selectedEntityId: selectedId,
        selectEntity,
    } = useWorldInteraction();
    const token = useRuntimeRevisionToken(runtime, {
        entityIds: selectedId ? [selectedId] : [],
        includeEntityListRevision: true,
        includeBlueprintRevision: true,
    });
    const entity = useRuntimeSelector(
        runtime,
        {
            entityIds: selectedId ? [selectedId] : [],
            includeEntityListRevision: true,
            includeBlueprintRevision: true,
        },
        (currentRuntime) => {
            if (!currentRuntime || !selectedId) return null;
            return currentRuntime.getEntity(selectedId) ?? null;
        },
    );
    const baselineRef = useRef<{
        runtime: SelectedEntityActions["runtime"];
        selectedId: string | null;
        lensId: string | null;
    }>({ runtime: null, selectedId: null, lensId: null });

    useEffect(() => {
        if (!runtime || !selectedId) {
            baselineRef.current = {
                runtime: null,
                selectedId: null,
                lensId: null,
            };
            return;
        }
        if (
            baselineRef.current.runtime !== runtime ||
            baselineRef.current.selectedId !== selectedId
        ) {
            baselineRef.current = {
                runtime,
                selectedId,
                lensId: entity
                    ? (resolveSelectionLens(entity, runtime)?.id ?? null)
                    : null,
            };
        }
    }, [entity, runtime, selectedId, token]);

    useEffect(() => {
        if (!runtime || !selectedId) return;
        const currentLensId = entity
            ? (resolveSelectionLens(entity, runtime)?.id ?? null)
            : null;
        if (!entity || currentLensId !== baselineRef.current.lensId) {
            selectEntity(null);
        }
    }, [entity, runtime, selectEntity, selectedId, token]);

    const deselect = () => selectEntity(null);

    const killSelected = () => {
        if (!runtime || !entity?.id) return;
        runtime.commands.enqueue({
            type: RuntimeCommandType.KILL,
            payload: { entityId: entity.id },
        });
    };

    return {
        runtime,
        entity,
        selectedId,
        deselect,
        killSelected,
    };
};

