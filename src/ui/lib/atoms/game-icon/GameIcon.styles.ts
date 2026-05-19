import styled from "@emotion/styled";
import { IconSize } from "./types";
import { Theme } from "@emotion/react";

const getSizeValue = (theme: Theme, size: IconSize): string => {
    switch (size) {
        case "xs":
            return theme.iconSize.xs;
        case "sm":
            return theme.iconSize.sm;
        case "lg":
            return theme.iconSize.lg;
        case "xl":
            return theme.iconSize.xl;
        case "md":
        default:
            return theme.iconSize.md;
    }
};

export const IconContainer = styled.span<{ size: IconSize }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* Enforce square aspect ratio and specific size */
    width: ${({ theme, size }) => getSizeValue(theme, size)};
    height: ${({ theme, size }) => getSizeValue(theme, size)};
    font-size: ${({ theme, size }) => getSizeValue(theme, size)};
    line-height: 1;
    flex-shrink: 0;
    user-select: none;

    svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;

