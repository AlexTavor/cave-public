import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import {
    useEnsureModuleSession,
    useModuleSession,
} from "../../../state/moduleSession";
import { useBlueprintContext } from "../BlueprintContext";
import {
    getPreviewSupport,
    readGlyphDraft,
    readRadiusDraft,
    resolveDisplayId,
    readSelectedPlacementEditorState,
    readStyleDraft,
} from "./blueprintVisualsDraft";
import type { ViewEditorAdapter } from "../../view-editor/ViewEditor.types";
import { buildBlueprintViewEditor } from "./buildBlueprintViewEditor";
import { createBlueprintVisualsEditorActions } from "./useBlueprintVisualsEditorActions";
import {
    mergeVisualDrafts,
    resolveVisualAssetFilename,
} from "./visualAssetLinking";
import { ensureResourceViewAssets } from "../../view-editor/viewEditorAssetLinking";

export const useBlueprintVisualsEditor = (): ViewEditorAdapter | null => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();
    const draft = useSessionStore((state) => state.sessions[filename]?.draft);
    const registerFlushHandler = useSessionStore(
        (state) => state.registerFlushHandler,
    );
    const unregisterFlushHandler = useSessionStore(
        (state) => state.unregisterFlushHandler,
    );
    const isOpen = useSessionStore(
        (state) =>
            state.sessions[filename]?.ui?.[scopeId]?.isVisualsOpen ?? false,
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const updateSessionUi = useSessionStore((state) => state.updateSessionUi);
    const assetFilename = resolveVisualAssetFilename(filename);
    useEnsureModuleSession(assetFilename);
    const assetSession = useModuleSession(assetFilename);
    const [selectedPosition, setSelectedPosition] = useState(4);
    const mergedDraft = useMemo(
        () => mergeVisualDrafts(draft ?? null, assetSession.draft),
        [draft, assetSession.draft],
    );
    useEffect(() => {
        if (!isOpen) return;
        updateDraft(assetFilename, (assetDraft) => {
            const displayId = draft
                ? resolveDisplayId(draft, blueprintId)
                : blueprintId;
            ensureResourceViewAssets(assetDraft, displayId);
        });
    }, [assetFilename, blueprintId, draft, isOpen, updateDraft]);
    useEffect(() => {
        const handlerId = `visual-assets:${blueprintId}`;
        registerFlushHandler(filename, handlerId, async () => {
            if (assetSession.isDirty) await assetSession.save();
        });
        return () => unregisterFlushHandler(filename, handlerId);
    }, [
        assetSession.isDirty,
        assetSession.save,
        blueprintId,
        filename,
        registerFlushHandler,
        unregisterFlushHandler,
    ]);
    const styleDraft = mergedDraft
        ? readStyleDraft(mergedDraft, blueprintId)
        : null;
    const glyphDraft = mergedDraft
        ? readGlyphDraft(mergedDraft, blueprintId)
        : null;
    const displayId = draft
        ? resolveDisplayId(draft, blueprintId)
        : blueprintId;
    const radiusDraft = draft ? readRadiusDraft(draft, blueprintId) : null;
    const selectedPlacement = glyphDraft
        ? readSelectedPlacementEditorState(glyphDraft, selectedPosition)
        : null;
    const actions = createBlueprintVisualsEditorActions({
        blueprintFilename: filename,
        assetFilename,
        blueprintId,
        getBlueprintDraft: () =>
            useSessionStore.getState().sessions[filename]?.draft ?? null,
        updateDraft,
    });
    if (
        !mergedDraft ||
        !styleDraft ||
        !glyphDraft ||
        !radiusDraft ||
        !selectedPlacement
    ) {
        return null;
    }

    return buildBlueprintViewEditor({
        isOpen,
        close: () =>
            updateSessionUi(filename, scopeId, (ui) => {
                ui.isVisualsOpen = false;
            }),
        mergedDraft,
        blueprintId,
        displayId,
        styleDraft,
        glyphDraft,
        radiusDraft,
        selectedPosition,
        selectedPlacement,
        setSelectedPosition,
        actions,
        previewEnabled: getPreviewSupport(mergedDraft, blueprintId).supported,
    });
};
