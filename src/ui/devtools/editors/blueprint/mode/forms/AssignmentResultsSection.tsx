import React, { useCallback } from "react";
import type { AssignmentResultConfig } from "../../../../../../data/schemas/abilities/assignment";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { useSessionStore } from "../../../../state/useSessionStore";
import { Button } from "../../../../../lib/atoms/button";
import { SectionLabel } from "./AssignmentAbilityForm.styles";
import { AssignmentResultRow } from "./AssignmentResultRow";

const EMPTY_RESULTS: AssignmentResultConfig[] = [];
const createSpawnResource = (): AssignmentResultConfig => ({
    type: "spawn_resource",
    resource: "",
    source: "fixed",
    factor: 1,
    target: "sys_world",
});

interface AssignmentResultsSectionProps {
    basePath: string;
    filename: string;
}

export const AssignmentResultsSection: React.FC<
    AssignmentResultsSectionProps
> = ({ basePath, filename }) => {
    const path = `${basePath}.results`;
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const results = useSessionStore(
        useCallback(
            (state) => {
                const value = getByPath(state.sessions[filename]?.draft, path);
                return Array.isArray(value)
                    ? (value as AssignmentResultConfig[])
                    : EMPTY_RESULTS;
            },
            [filename, path],
        ),
    );
    const updateResults = (recipe: (draft: AssignmentResultConfig[]) => void) =>
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, path);
            const next = Array.isArray(current)
                ? [...(current as AssignmentResultConfig[])]
                : [];
            recipe(next);
            setByPath(draft, path, next);
        });
    const hasDestroy = results.some(
        (item) => item.type === "destroy_assigned_bodies",
    );
    const hasTransfer = results.some((item) => item.type === "transfer_habiti");

    return (
        <>
            <SectionLabel>Results</SectionLabel>
            {results.map((result, index) => (
                <AssignmentResultRow
                    key={`${path}.${index}.${result.type}`}
                    filename={filename}
                    path={`${path}.${index}`}
                    result={result}
                    onDelete={() =>
                        updateResults((next) => next.splice(index, 1))
                    }
                />
            ))}
            <Button
                size="sm"
                variant="ghost"
                disabled={hasDestroy}
                onClick={() =>
                    updateResults((next) =>
                        next.push({ type: "destroy_assigned_bodies" }),
                    )
                }
            >
                Add Destroy Bodies
            </Button>
            <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                    updateResults((next) => next.push(createSpawnResource()))
                }
            >
                Add Spawn Resource
            </Button>
            <Button
                size="sm"
                variant="ghost"
                disabled={hasTransfer}
                onClick={() =>
                    updateResults((next) =>
                        next.push({ type: "transfer_habiti" }),
                    )
                }
            >
                Add Transfer Habiti
            </Button>
        </>
    );
};
