import React, { useMemo } from "react";
import { RichTextProps } from "./types";
import { RichTextContainer } from "./RichText.styles";
import { renderRichTextNodes } from "./renderRichTextNodes";
import { useRichTextContext } from "./RichTextContext";

export const RichText: React.FC<RichTextProps> = ({
    text,
    variant = "body",
    className,
}) => {
    const context = useRichTextContext();
    const nodes = useMemo(
        () => renderRichTextNodes(text, context?.processors),
        [context?.processors, text],
    );

    return (
        <RichTextContainer variant={variant} className={className}>
            {nodes}
        </RichTextContainer>
    );
};

