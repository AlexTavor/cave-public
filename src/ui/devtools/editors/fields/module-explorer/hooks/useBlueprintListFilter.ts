import { useMemo, useState } from "react";
import type { Blueprint } from "../../../../../../data/schemas/blueprint";

export interface BlueprintEntry {
    id: string;
    blueprint: Blueprint;
}

export const useBlueprintListFilter = (entries: BlueprintEntry[]) => {
    const [showSystem, setShowSystem] = useState(false);

    const filteredBlueprints = useMemo(() => {
        if (showSystem) return entries;
        return entries.filter((entry) => {
            const tags = entry.blueprint.tags ?? [];
            return !tags.includes("system") && !tags.includes("internal");
        });
    }, [entries, showSystem]);

    const toggleSystem = () => setShowSystem((prev) => !prev);

    return { filteredBlueprints, showSystem, toggleSystem };
};
