import React from "react";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useBlueprintContext } from "../../BlueprintContext";
import { useHabitusReferenceCatalog } from "../hooks/useHabitusReferenceCatalog";
import { useTraitReferenceCatalog } from "../hooks/useTraitReferenceCatalog";
import { AssignmentFilterRow } from "./AssignmentFilterRow";

const EMPTY_FILTERS: unknown[] = [];

export const AssignmentFiltersSection: React.FC<{ basePath: string }> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();
    const { ids: habitusIds } = useHabitusReferenceCatalog();
    const { ids: traitIds } = useTraitReferenceCatalog();
    const filters = useSessionStore((state) => {
        const value = getByPath(
            state.sessions[filename]?.draft,
            `${basePath}.filter`,
        );
        return Array.isArray(value) ? value : EMPTY_FILTERS;
    });
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const setFilters = (next: unknown[]) =>
        updateDraft(filename, (draft) =>
            setByPath(draft, `${basePath}.filter`, next),
        );

    return (
        <div>
            {filters.map((filter, index) => (
                <AssignmentFilterRow
                    key={`${basePath}.filter.${index}`}
                    filename={filename}
                    path={`${basePath}.filter.${index}`}
                    index={index}
                    suggestions={
                        filter?.kind === "required_traits_all"
                            ? traitIds
                            : habitusIds
                    }
                    onDelete={() =>
                        setFilters(filters.filter((_, row) => row !== index))
                    }
                />
            ))}
            <button
                type="button"
                onClick={() =>
                    setFilters([
                        ...filters,
                        { kind: "required_habiti_all", ids: [] },
                    ])
                }
            >
                + Add Filter
            </button>
        </div>
    );
};
