import React from "react";
import type { AssignmentMinimumProgress } from "../../../../../game/assignment/assignmentMinimums";
import {
    StatGroupTitle,
    StatLabel,
    StatRow,
    StatValue,
} from "../SelectionCard.styles";

interface AssignmentRequirementsSectionProps {
    filterLabels: string[];
    minimumRows: AssignmentMinimumProgress[];
}

export const AssignmentRequirementsSection: React.FC<
    AssignmentRequirementsSectionProps
> = ({ filterLabels, minimumRows }) => {
    if (filterLabels.length === 0 && minimumRows.length === 0) return null;
    return (
        <div>
            <StatGroupTitle>Assignment Requirements</StatGroupTitle>
            {filterLabels.map((label) => (
                <StatRow key={label}>
                    <StatLabel>{label}</StatLabel>
                </StatRow>
            ))}
            {minimumRows.map((row) => (
                <StatRow key={row.label}>
                    <StatLabel>{row.label}</StatLabel>
                    <StatValue>
                        {row.current}/{row.required}
                    </StatValue>
                </StatRow>
            ))}
        </div>
    );
};
