import React from "react";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useBlueprintContext } from "../../BlueprintContext";
import { AssignmentMinimumRow } from "./AssignmentMinimumRow";

const EMPTY_MINIMUMS: unknown[] = [];

export const AssignmentMinimumsSection: React.FC<{ basePath: string }> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();
    const minimums = useSessionStore((state) => {
        const value = getByPath(
            state.sessions[filename]?.draft,
            `${basePath}.minimums`,
        );
        return Array.isArray(value) ? value : EMPTY_MINIMUMS;
    });
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const setMinimums = (next: unknown[]) =>
        updateDraft(filename, (draft) =>
            setByPath(draft, `${basePath}.minimums`, next),
        );

    return (
        <div>
            {minimums.map((row, index) => (
                <AssignmentMinimumRow
                    key={`${row?.kind ?? "minimum"}-${row?.attribute ?? ""}-${row?.required ?? 0}`}
                    filename={filename}
                    path={`${basePath}.minimums.${index}`}
                    index={index}
                    kind={row?.kind ?? "level_total"}
                    onDelete={() =>
                        setMinimums(
                            minimums.filter((_, item) => item !== index),
                        )
                    }
                />
            ))}
            <button
                type="button"
                onClick={() =>
                    setMinimums([
                        ...minimums,
                        { kind: "level_total", required: 0 },
                    ])
                }
            >
                + Add Minimum
            </button>
        </div>
    );
};
