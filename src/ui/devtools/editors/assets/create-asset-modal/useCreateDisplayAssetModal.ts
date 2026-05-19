import { useCallback, useEffect, useMemo, useState } from "react";
import { useModuleStore } from "../../../state/moduleStore";
import { useShellStore } from "../../../shell/shell";
import { useSessionStore } from "../../../state/useSessionStore";
import {
    ASSET_CATEGORY_DISPLAYS,
    type ModuleDisplayAsset,
} from "../../../state/moduleStore.assets";
import { DEFAULT_DISPLAY_TYPE } from "./CreateAssetModal.constants";
import { deepClone } from "../../../../../utils/objectUtils";
import { createDefaultDisplayAsset } from "../display/displayEditorHelpers";

export const useCreateDisplayAssetModal = (params: {
    isOpen: boolean;
    filename: string;
    onClose: () => void;
    onCreated?: (assetId: string) => void;
    initialId?: string;
}) => {
    const { isOpen, filename, onClose, onCreated, initialId } = params;
    const { openFile } = useShellStore();
    const saveAssetToModule = useModuleStore((s) => s.saveAssetToModule);
    const moduleData = useModuleStore((s) => s.modules[filename] ?? null);
    const sessionDisplays = useSessionStore(
        (s) => s.sessions[filename]?.draft.assets?.displays ?? null,
    );
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const existingIds = useMemo(
        () =>
            new Set(
                Object.keys(
                    sessionDisplays ?? moduleData?.assets?.displays ?? {},
                ),
            ),
        [moduleData, sessionDisplays],
    );
    const [idValue, setIdValue] = useState("");
    const [typeValue, setTypeValue] =
        useState<ModuleDisplayAsset["type"]>(DEFAULT_DISPLAY_TYPE);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setIdValue(initialId ?? "");
        setTypeValue(DEFAULT_DISPLAY_TYPE);
        setError(null);
        setSaving(false);
    }, [initialId, isOpen]);

    const handleCreate = useCallback(async () => {
        const nextId = idValue.trim();
        if (!nextId) return setError("ID is required.");
        if (existingIds.has(nextId))
            return setError(
                `Display '${nextId}' already exists in this module.`,
            );
        const assetData = createDefaultDisplayAsset(typeValue);
        setSaving(true);
        setError(null);
        try {
            await saveAssetToModule({
                filename,
                category: ASSET_CATEGORY_DISPLAYS,
                assetId: nextId,
                assetData,
            });
            if (useSessionStore.getState().sessions[filename]) {
                updateDraft(filename, (draft) => {
                    draft.assets.displays[nextId] = deepClone(assetData);
                });
            }
            onCreated?.(nextId);
            openFile(
                `${filename}::assets::${ASSET_CATEGORY_DISPLAYS}::${nextId}`,
            );
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    }, [
        existingIds,
        filename,
        idValue,
        onClose,
        onCreated,
        openFile,
        saveAssetToModule,
        typeValue,
        updateDraft,
    ]);

    return {
        error,
        handleCreate,
        idValue,
        saving,
        setIdValue,
        setTypeValue,
        typeValue,
    };
};
