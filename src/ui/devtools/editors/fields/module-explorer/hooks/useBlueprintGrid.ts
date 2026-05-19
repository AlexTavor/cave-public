import { useMemo } from "react";
import { useExplorerStore } from "../state/explorerStore";
import { useModuleStore } from "../../../../state/moduleStore";
import type { Blueprint } from "../../../../../../data/schemas/blueprint";

export interface UseBlueprintGridParams {
    filename: string;
    sessionId: string;
}

export interface BlueprintGridState {
    blueprints: Array<[string, Blueprint]>;
}

export function useBlueprintGrid({
    filename,
    sessionId,
}: UseBlueprintGridParams): BlueprintGridState {
    const session = useExplorerStore((s) => s.sessions[sessionId]);
    const filter = session?.filter ?? "";

    const moduleData = useModuleStore((s) => s.modules[filename]);

    const blueprintsRaw: Record<string, Blueprint> = useMemo(
        () => moduleData?.blueprints || {},
        [moduleData],
    );

    const blueprints = useMemo(() => {
        const normalizedFilter = filter.trim().toLowerCase();
        return Object.entries(blueprintsRaw).filter(([id, bp]) => {
            if (!normalizedFilter) return true;
            const label = (bp?.label || bp?.components?.display?.label || "")
                .toString()
                .toLowerCase();
            return (
                id.toLowerCase().includes(normalizedFilter) ||
                label.includes(normalizedFilter)
            );
        });
    }, [blueprintsRaw, filter]);

    return { blueprints };
}
