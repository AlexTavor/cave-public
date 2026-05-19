import styled from "@emotion/styled";
import { Theme } from "@emotion/react";
import { RichTextVariant } from "./types";

const getVariantStyles = (theme: Theme, variant: RichTextVariant) => {
    switch (variant) {
        case "header":
            return `
                font-family: ${theme.fonts.observer};
                font-size: ${theme.fontSize.xl};
                font-weight: 700;
                color: ${theme.colors.text};
                letter-spacing: 0.02em;
                margin-bottom: ${theme.spacing.xs};
            `;
        case "narration":
            return `
                font-family: ${theme.fonts.observer};
                font-size: ${theme.fontSize.lg};
                font-style: italic;
                color: ${theme.colors.secondary};
                opacity: 0.9;
            `;
        case "celebration":
            return `
                font-family: ${theme.fonts.observer};
                font-size: ${theme.fontSize.xl};
                font-weight: 700;
                color: ${theme.colors.xp};
                letter-spacing: 0.03em;
                width: max-content;
            `;
        case "title":
            return `
                font-family: ${theme.fonts.observer};
                font-size: ${theme.fontSize.lg};
                font-weight: 600;
                color: ${theme.colors.text};
            `;
        case "callout":
            return `
                font-family: ${theme.fonts.ui};
                font-size: ${theme.fontSize.xl};
                color: ${theme.colors.text};
                pointer-events: none;
            `;
        case "body":
        default:
            return `
                font-family: ${theme.fonts.ui};
                font-size: ${theme.fontSize.base};
                color: ${theme.colors.text};
            `;
    }
};

export const RichTextContainer = styled.div<{ variant: RichTextVariant }>`
    line-height: 1.5;
    white-space: pre-wrap;

    /* Apply variant styles */
    ${({ theme, variant }) => getVariantStyles(theme, variant)}

    strong {
        font-weight: 700;
        color: inherit;
    }

    em {
        font-style: italic;
    }
`;

export const StyledRefSpan = styled.span`
    color: ${({ theme }) => theme.colors.buttonSelected};
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: ${({ theme }) => theme.spacing.xs};
    transition: color 0.2s;
    font-style: normal;
`;

