import React from "react";
import styled from "@emotion/styled";
import type { z } from "zod";
import { NumberField } from "../../../../fields/number-field/NumberField";
import { ScalableValueSchema } from "../../../../../../../data/schemas/abilities/utils";

const Group = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const GroupLabel = styled.div`
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
`;

const Row = styled.div`
    display: flex;
    gap: 12px;
`;

interface ScalableValueInputProps {
    label: string;
    filename: string;
    basePath: string;
    baseSchema: z.ZodTypeAny;
    perBodySchema: z.ZodTypeAny;
    tooltipBase?: string;
    tooltipPerBody?: string;
    tooltipMultPerBody?: string;
}

export const ScalableValueInput: React.FC<ScalableValueInputProps> = ({
    label,
    filename,
    basePath,
    baseSchema,
    perBodySchema,
    tooltipBase,
    tooltipPerBody,
    tooltipMultPerBody,
}) => (
    <Group>
        <GroupLabel>{label}</GroupLabel>
        <Row>
            <NumberField
                label="Base"
                schema={baseSchema}
                filename={filename}
                path={`${basePath}.base`}
                tooltip={tooltipBase}
            />
            <NumberField
                label="+ / Body"
                schema={perBodySchema}
                filename={filename}
                path={`${basePath}.perBody`}
                tooltip={tooltipPerBody}
            />
            <NumberField
                label="* / Body"
                schema={ScalableValueSchema.shape.multPerBody}
                filename={filename}
                path={`${basePath}.multPerBody`}
                tooltip={
                    tooltipMultPerBody ??
                    "Multiplier applied per body. Final value = (base + perBody * pop) * (multPerBody * pop)."
                }
            />
        </Row>
    </Group>
);
