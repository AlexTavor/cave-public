import React from "react";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { FieldContainer, Label } from "../../fields/Shared.styles";

export const DisplayEditorField = ({
    controlId,
    label,
    tooltip,
    children,
}: React.PropsWithChildren<{
    controlId: string;
    label: string;
    tooltip: string;
}>) => (
    <FieldContainer>
        <SmartTooltip content={tooltip}>
            <Label htmlFor={controlId}>{label}</Label>
        </SmartTooltip>
        {children}
    </FieldContainer>
);
