import React from "react";
import styled from "@emotion/styled";
import { ScalableValueSchema } from "../../../../../../data/schemas/abilities/utils";
import { ResourceField } from "./atoms/ResourceField";
import { ScalableValueInput } from "./atoms/ScalableValueInput";
import { Button } from "../../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";

const SectionLabel = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
`;

const Row = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
`;

interface ConversionItemsSectionProps {
    label: string;
    filename: string;
    basePath: string;
    items: unknown[];
    resourceKeys: string[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    sectionTooltip?: string;
    resourceTooltip?: string;
    amountTooltip?: string;
}

export const ConversionItemsSection: React.FC<ConversionItemsSectionProps> = ({
    label,
    filename,
    basePath,
    items,
    resourceKeys,
    onAdd,
    onRemove,
    sectionTooltip,
    resourceTooltip,
    amountTooltip,
}) => {
    const scalarShape = ScalableValueSchema.shape;

    return (
        <>
            {sectionTooltip ? (
                <SmartTooltip content={sectionTooltip}>
                    <SectionLabel>{label}</SectionLabel>
                </SmartTooltip>
            ) : (
                <SectionLabel>{label}</SectionLabel>
            )}
            {items.map((_, index) => (
                <Row key={`${label}-${index}`}>
                    <ResourceField
                        label="Resource"
                        filename={filename}
                        path={`${basePath}.${index}.resource`}
                        suggestions={resourceKeys}
                        tooltip={resourceTooltip}
                    />
                    <ScalableValueInput
                        label="Amount"
                        filename={filename}
                        basePath={`${basePath}.${index}.amount`}
                        baseSchema={scalarShape.base}
                        perBodySchema={scalarShape.perBody}
                        tooltipBase={amountTooltip}
                        tooltipPerBody={amountTooltip}
                    />
                    <SmartTooltip content="Remove item">
                        <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onRemove(index)}
                        >
                            ×
                        </Button>
                    </SmartTooltip>
                </Row>
            ))}
            <Button size="sm" variant="ghost" onClick={onAdd}>
                Add {label}
            </Button>
        </>
    );
};
