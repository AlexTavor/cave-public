import React from "react";
import { useRichTextContext } from "./RichTextContext";
import { SmartTooltip } from "../tooltip/SmartTooltip";
import { StyledRefSpan } from "./RichText.styles";

interface RefLinkProps {
    type: string;
    id: string;
    children: React.ReactNode;
}

export const RefLink: React.FC<RefLinkProps> = ({ type, id, children }) => {
    const context = useRichTextContext();

    // If no context is present, just render the text without interaction
    if (!context?.resolveRef) {
        return <span>{children}</span>;
    }

    const tooltipContent = context.resolveRef(type, id);

    if (!tooltipContent) {
        return <span>{children}</span>;
    }

    return (
        <SmartTooltip content={tooltipContent}>
            <StyledRefSpan>{children}</StyledRefSpan>
        </SmartTooltip>
    );
};

