import React from "react";
import { FieldContainer } from "../Shared.styles"; // From Shared.styles.tsx? Or Shared.styles.ts
import { FieldProps } from "../Shared.types";
import { useBooleanField } from "./useBooleanField";
import { Checkbox, CursorLabel } from "./BooleanField.styles";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

interface BooleanFieldProps extends FieldProps {}

export const BooleanField: React.FC<BooleanFieldProps> = ({
    label,
    filename,
    path,
    tooltip,
}) => {
    const { value, handleChange } = useBooleanField(filename, path);

    const content = (
        <CursorLabel>
            {label}
            <Checkbox type="checkbox" checked={value} onChange={handleChange} />
        </CursorLabel>
    );

    return (
        <FieldContainer>
            {tooltip ? (
                <SmartTooltip content={tooltip}>{content}</SmartTooltip>
            ) : (
                content
            )}
        </FieldContainer>
    );
};
