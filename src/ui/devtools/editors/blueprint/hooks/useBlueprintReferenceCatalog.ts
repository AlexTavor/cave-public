import { useCallback, useMemo } from "react";
import { workspaceService } from "../../../../../engine/terminal/commands/projectServices";
import { useRuntimeStore } from "../../../../runtime/state/useRuntimeStore";
import { useShellStore } from "../../../shell/shell";
import { useSessionStore } from "../../../state/useSessionStore";
import { useBlueprintContext } from "../BlueprintContext";

const EMPTY_BLUEPRINTS = {};

type BlueprintLike = {
    label?: string;
    components?: { display?: { label?: string } };
    render?: { label?: string };
};

const resolveLabel = (id: string, blueprint?: BlueprintLike) =>
    blueprint?.label ??
    blueprint?.components?.display?.label ??
    blueprint?.render?.label ??
    id;

export const useBlueprintReferenceCatalog = () => {
    const { filename } = useBlueprintContext();
    const activeManifestPath = useShellStore(
        (state) => state.activeManifestPath,
    );
    const runtime = useRuntimeStore((state) => state.runtime);
    const draftBlueprints = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.draft.blueprints ?? EMPTY_BLUEPRINTS,
            [filename],
        ),
    );

    return useMemo(() => {
        const labels = new Map<string, string>();
        const linkedBlueprints =
            workspaceService.activeCartridge?.blueprints ?? {};

        Object.entries(linkedBlueprints).forEach(([id, blueprint]) => {
            labels.set(id, resolveLabel(id, blueprint));
        });
        Object.entries(draftBlueprints).forEach(([id, blueprint]) => {
            labels.set(id, resolveLabel(id, blueprint));
        });

        const ids = [...labels.keys()].sort((left, right) =>
            left.localeCompare(right),
        );
        const options = ids
            .map((id) => ({ id, label: labels.get(id) ?? id }))
            .sort(
                (left, right) =>
                    left.label.localeCompare(right.label) ||
                    left.id.localeCompare(right.id),
            );

        return { ids, options };
    }, [activeManifestPath, draftBlueprints, runtime]);
};
