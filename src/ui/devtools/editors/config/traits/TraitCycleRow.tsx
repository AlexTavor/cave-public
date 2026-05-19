import React from "react";
import { z } from "zod";
import styled from "@emotion/styled";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { SimpleStringField } from "../../blueprint/mode/forms/SimpleStringField";
import { NumberField } from "../../fields/number-field/NumberField";
import { TraitModifiersSection } from "./TraitModifiersSection";

const CycleBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const NUMBER_SCHEMA = z.number();

interface TraitCycleRowProps {
    filename: string;
    basePath: string;
    index: number;
    onRemove: () => void;
    suggestions?: string[];
}

export const TraitCycleRow: React.FC<TraitCycleRowProps> = ({
    filename,
    basePath,
    index,
    onRemove,
    suggestions,
}) => (
    <ComponentRow
        title={`Cycle ${index + 1}`}
        icon={<span>🔄</span>}
        summary="Periodic effect"
        defaultOpen={false}
        onDelete={onRemove}
        deleteLabel="Remove Cycle"
    >
        <CycleBody>
            <SimpleStringField
                label="Cycle ID"
                filename={filename}
                path={`${basePath}.id`}
                tooltip="Unique identifier for this cycle within the trait."
            />
            <NumberField
                label="Period (seconds)"
                filename={filename}
                path={`${basePath}.periodSeconds`}
                schema={NUMBER_SCHEMA}
                tooltip="How often this cycle triggers, in seconds. Must be greater than zero."
            />
            <TraitModifiersSection
                filename={filename}
                basePath={`${basePath}.effects`}
                heading="Effects"
                suggestions={suggestions}
            />
        </CycleBody>
    </ComponentRow>
);
