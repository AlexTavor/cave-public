import { useCallback, useEffect, useState } from "react";
import type { Blueprint } from "../../../../../data/schemas/blueprint";
import { useSessionStore } from "../../../state/useSessionStore";
import { CompilerService } from "../../../../../engine/compiler/CompilerService";

type BlueprintViewMode = "designer" | "raw";

interface UseBlueprintEditorModeParams {
    filename: string;
    blueprintId: string;
    blueprint: Blueprint | null;
}

export const useBlueprintEditorMode = ({
    filename,
    blueprintId,
    blueprint,
}: UseBlueprintEditorModeParams) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [viewMode, setViewMode] = useState<BlueprintViewMode>("raw");
    const [hasUserOverride, setHasUserOverride] = useState(false);

    useEffect(() => {
        if (!blueprint || hasUserOverride) return;
        if (blueprint._editor && viewMode === "raw") {
            setViewMode("designer");
        }
    }, [blueprint, hasUserOverride, viewMode]);

    const setMode = useCallback(
        (next: BlueprintViewMode) => {
            setHasUserOverride(true);
            if (next === "raw" && blueprint) {
                const compiled = new CompilerService().compile(blueprint);
                updateDraft(filename, (draft) => {
                    if (!draft.blueprints[blueprintId]) return;
                    draft.blueprints[blueprintId] = compiled;
                });
            }
            setViewMode(next);
        },
        [blueprint, blueprintId, filename, updateDraft],
    );

    return { viewMode, setViewMode: setMode };
};
