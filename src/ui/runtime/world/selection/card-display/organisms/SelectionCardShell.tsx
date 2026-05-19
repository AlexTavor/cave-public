import React from "react";
import { SelectionCardRoot } from "../../SelectionCard.styles";

export const SelectionCardShell: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => (
    <SelectionCardRoot padding="lg" id="SelectionCardRoot">
        {children}
    </SelectionCardRoot>
);
