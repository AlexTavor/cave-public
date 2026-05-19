import React, { useCallback } from "react";
import { Button } from "../../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { useSessionStore } from "../../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { CycleResourceCostRow } from "./CycleResourceCostRow";

const EMPTY_COSTS: any[] = [];

const createCost = () => ({
    resource: "",
    amount: { base: 0, perBody: 0, multPerBody: 0 },
    requestPerSecondAtFullThrottle: 999999,
    requestCadenceSeconds: 1,
    scaleByBodiesOwned: false,
    scaleByCyclesCompleted: false,
    visible: true,
    priority: 0,
});

export const CycleResourceCostsSection: React.FC<{
    filename: string;
    basePath: string;
}> = ({ filename, basePath }) => {
    const path = `${basePath}.resourceCosts`;
    const costs = useSessionStore((state) => {
        const value = getByPath(state.sessions[filename]?.draft, path);
        return Array.isArray(value) ? value : EMPTY_COSTS;
    });
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const addCost = useCallback(() => {
        updateDraft(filename, (draft) =>
            setByPath(draft, path, [...costs, createCost()]),
        );
    }, [costs, filename, path, updateDraft]);
    const removeCost = useCallback(
        (index: number) => {
            updateDraft(filename, (draft) => {
                const next = [...costs];
                next.splice(index, 1);
                setByPath(draft, path, next);
            });
        },
        [costs, filename, path, updateDraft],
    );
    return (
        <>
            <SmartTooltip content="Configure local resource reservoirs that must be filled before a cycle can complete.">
                <p style={{ opacity: 0.6, fontSize: 13, cursor: "help" }}>
                    Cycle resource costs
                </p>
            </SmartTooltip>
            {costs.map((cost) => {
                const rowIndex = costs.indexOf(cost);
                const rowPath = `${path}.${rowIndex}`;
                return (
                    <CycleResourceCostRow
                        key={rowPath}
                        filename={filename}
                        path={rowPath}
                        index={rowIndex}
                        onDelete={() => removeCost(rowIndex)}
                    />
                );
            })}
            <SmartTooltip content="Add a cycle resource cost row.">
                <Button size="sm" variant="ghost" onClick={addCost}>
                    + Add Cycle Cost
                </Button>
            </SmartTooltip>
        </>
    );
};
