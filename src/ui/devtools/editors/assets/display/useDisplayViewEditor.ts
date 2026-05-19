import { useEffect, useState } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { readSelectedPlacementEditorState } from "../../blueprint/visuals/blueprintVisualsGlyphDraft";
import type { ViewEditorAdapter } from "../../view-editor/ViewEditor.types";
import { createAssetScopeId } from "../../../state/moduleSession/scopes";
import { buildDisplayAssetViewEditor } from "./buildDisplayAssetViewEditor";
import { createDisplayViewEditorActions } from "./displayViewEditorActions";
import { resolveDisplayViewIds } from "./displayViewEditorIds";
import {
    ensureAttributePoolGlyphAsset,
    ensureResourceViewAssets,
} from "../../view-editor/viewEditorAssetLinking";

export const useDisplayViewEditor = ({
    filename,
    assetId,
}: {
    filename: string;
    assetId: string;
}): ViewEditorAdapter | null => {
    const [selectedPosition, setSelectedPosition] = useState(4);
    const [previewProgress, setPreviewProgress] = useState(100);
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const updateSessionUi = useSessionStore((state) => state.updateSessionUi);
    const scopeId = createAssetScopeId("displays", assetId);
    const draft = useSessionStore(
        (state) => state.sessions[filename]?.draft ?? null,
    );
    const isOpen = useSessionStore(
        (state) =>
            state.sessions[filename]?.ui?.[scopeId]?.isVisualsOpen ?? false,
    );
    const display = draft?.assets.displays?.[assetId];
    const { glyphId, styleId } = resolveDisplayViewIds(display, assetId);
    useEffect(() => {
        if (!isOpen) return;
        updateDraft(filename, (moduleDraft) => {
            if (moduleDraft.assets.displays[assetId]?.type === "resource")
                ensureResourceViewAssets(moduleDraft, assetId);
            if (moduleDraft.assets.displays[assetId]?.type === "attribute_pool")
                ensureAttributePoolGlyphAsset(
                    moduleDraft,
                    assetId,
                    moduleDraft.assets.displays[assetId].attribute,
                );
        });
    }, [assetId, filename, isOpen, updateDraft]);
    const glyphDraft = glyphId ? draft?.assets.glyphs?.[glyphId] : null;
    const styleDraft = styleId ? draft?.assets.styles?.[styleId] : null;
    const selectedPlacement =
        glyphDraft &&
        readSelectedPlacementEditorState(glyphDraft, selectedPosition);
    const actions = createDisplayViewEditorActions({
        filename,
        glyphId,
        styleId,
        updateDraft,
    });
    if (
        !draft ||
        !display ||
        !styleDraft ||
        !glyphDraft ||
        !selectedPlacement ||
        display.type === "body"
    )
        return null;
    return buildDisplayAssetViewEditor({
        isOpen,
        close: () =>
            updateSessionUi(filename, scopeId, (ui) => {
                ui.isVisualsOpen = false;
            }),
        draft,
        styleDraft,
        glyphDraft,
        selectedPosition,
        selectedPlacement,
        setSelectedPosition,
        previewProgress,
        setPreviewProgress,
        actions,
        updateDefaultLineThickness: (value: number) =>
            updateDraft(filename, (moduleDraft) => {
                const nextValue = Math.max(1, value);
                const displayDraft = moduleDraft.assets.displays[assetId];
                if (displayDraft?.type === "body") return;
                if (displayDraft) {
                    displayDraft.defaultLineThickness = nextValue;
                }
            }),
        filename,
        assetId,
    });
};
