import { useMemo } from "react";
import { useSessionStore } from "../../../state/useSessionStore";
import { useBlueprintSlice } from "../../../state/moduleSession/useBlueprintSlice";
import { createBlueprintScopeId } from "../../../state/moduleSession/scopes";

export interface PassportState {
    label: string;
    blueprintId: string;
    tags: string[];
    isDirty: boolean;
    openIdentity: () => void;
}

export function usePassport(
    filename: string,
    blueprintId: string,
): PassportState | null {
    const blueprint = useBlueprintSlice(filename, blueprintId);
    const isDirty = useSessionStore(
        (s) => s.sessions[filename]?.isDirty ?? false,
    );
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);
    const scopeId = createBlueprintScopeId(blueprintId);

    return useMemo(() => {
        if (!blueprint) return null;

        const label = blueprint.label || blueprintId;
        const tags = Array.isArray(blueprint.tags) ? blueprint.tags : [];

        return {
            label,
            blueprintId,
            tags,
            isDirty,
            openIdentity: () => {
                updateSessionUi(filename, scopeId, (ui) => {
                    ui.isIdentityOpen = true;
                });
            },
        };
    }, [blueprint, blueprintId, filename, isDirty, scopeId, updateSessionUi]);
}
