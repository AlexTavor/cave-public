import { useCallback } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { ComponentKey, registry } from "../registry";
import { Blueprint } from "../../../../../data/schemas/blueprint";
import { getDefaultValue } from "../../utils";
import { useBlueprintContext } from "../BlueprintContext";

export const useBlueprintActions = () => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);

    const addComponent = useCallback(
        (key: ComponentKey) => {
            updateDraft(filename, (moduleDraft) => {
                const blueprint = moduleDraft.blueprints[blueprintId];
                if (!blueprint) return;
                blueprint.components ??= {} as Blueprint["components"];
                const entry = registry[key];
                blueprint.components[key] = getDefaultValue(entry.schema);
            });

            // Auto-open the new component
            updateSessionUi(filename, scopeId, (ui) => {
                ui.expandedRows[key] = true;
            });
        },
        [filename, blueprintId, scopeId, updateDraft, updateSessionUi],
    );

    const removeComponent = useCallback(
        (key: ComponentKey) => {
            updateDraft(filename, (moduleDraft) => {
                const blueprint = moduleDraft.blueprints[blueprintId];
                if (!blueprint?.components) return;
                delete blueprint.components[key];
            });
        },
        [filename, blueprintId, updateDraft],
    );

    const toggleComponent = useCallback(
        (key: string, isOpen: boolean) => {
            updateSessionUi(filename, scopeId, (ui) => {
                ui.expandedRows[key] = isOpen;
            });
        },
        [filename, scopeId, updateSessionUi],
    );

    return {
        addComponent,
        removeComponent,
        toggleComponent,
    };
};
