import React from "react";
import { Label } from "../../SchemaForm.styles";
import * as S from "./ObjectField.styles";
import { SmartTooltip } from "../../../../lib/atoms/tooltip/SmartTooltip";

interface ObjectFieldHeaderProps {
    label: string;
    isOpen: boolean;
    onClick: () => void;
    tooltip?: string;
}

export const ObjectFieldHeader: React.FC<ObjectFieldHeaderProps> = ({
    label,
    isOpen,
    onClick,
    tooltip,
}) => {
    const header = (
        <S.CollapseHeader onClick={onClick}>
            <S.ToggleIcon isOpen={isOpen}>▶</S.ToggleIcon>
            <Label style={{ margin: 0, cursor: "pointer" }}>{label}</Label>
        </S.CollapseHeader>
    );
    if (!tooltip) return header;
    return <SmartTooltip content={tooltip}>{header}</SmartTooltip>;
};
