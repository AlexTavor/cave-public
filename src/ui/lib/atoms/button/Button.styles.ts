import styled from "@emotion/styled";
import isPropValid from "@emotion/is-prop-valid";
import { motion, isValidMotionProp } from "framer-motion";
import { ButtonSize, ButtonVariant } from "./types";
import { Theme } from "@emotion/react";

// Helper to map size to theme values
const getSizeStyles = (theme: Theme, size: ButtonSize) => {
    switch (size) {
        case "sm":
            return `
                padding: ${theme.spacing.xs} ${theme.spacing.sm};
                font-size: ${theme.fontSize.base};
            `;
        case "lg":
            return `
                padding: ${theme.spacing.md} ${theme.spacing.xl};
                font-size: ${theme.fontSize.lg};
            `;
        case "unpadded":
            return `
                padding: 0;
                font-size: ${theme.fontSize.base};
            `;
        case "md":
        default:
            return `
                padding: ${theme.spacing.sm} ${theme.spacing.md};
                font-size: ${theme.fontSize.lg};
            `;
    }
};

// Helper to resolve variant colors
export const getVariantColor = (theme: Theme, variant: ButtonVariant) => {
    switch (variant) {
        case "danger":
            return theme.colors.danger;
        case "ghost":
            return "transparent";
        case "primary":
        default:
            return theme.colors.buttonDefault;
    }
};

const shouldForwardProp = (prop: string) => {
    if (prop === "fullWidth" || prop === "size") return false;
    return isValidMotionProp(prop) || isPropValid(prop);
};

export const ButtonContainer = styled(motion.button, {
    shouldForwardProp,
})<{
    size: ButtonSize;
    fullWidth?: boolean;
    disabled?: boolean;
}>`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.ui};
    cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
    opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
    width: ${({ fullWidth }) => (fullWidth ? "100%" : "auto")};
    min-width: fit-content;
    user-select: none;
    outline: none;

    /* Dynamic Size Styles */
    ${({ theme, size }) => getSizeStyles(theme, size)}

    /* Text Shadow for readability on glowing backgrounds */
    text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.8);

    /* Stacking Context */
    z-index: 1;
`;

export const ButtonContent = styled.div`
    position: relative;
    z-index: 2;
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: center;
    justify-content: center;
    width: 100%;
`;

// The "Eye" Gradient Layer (The Iris)
export const EyeGradientLayer = styled(motion.div)<{
    color: string;
}>`
    position: absolute;
    /* Expand slightly beyond the container to account for the filter distortion */
    top: -${({ theme }) => theme.spacing.xs};
    left: -${({ theme }) => theme.spacing.xs};
    right: -${({ theme }) => theme.spacing.xs};
    bottom: -${({ theme }) => theme.spacing.xs};
    border-radius: ${({ theme }) => theme.radius.md};
    z-index: 0;

    /* Radial Gradient simulating the eye */
    background: ${({ color }) =>
        `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)`};
`;

// The Base Layer (Border/Background)
export const BaseLayer = styled.div<{
    variant: ButtonVariant;
}>`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: ${({ theme }) => theme.radius.md};
    z-index: -1;
    filter: url("#organic-edge");

    /* Ghost: No border/bg unless hovered (handled by EyeGradient).
       Others: Subtle border to define shape when idle.
    */
    border: ${({ theme }) => theme.borderWidth.thin} solid
        ${({ theme, variant }) =>
            variant === "ghost"
                ? "transparent"
                : theme.colors.surfaceHighlight};
    background: ${({ variant }) =>
        variant === "ghost" ? "transparent" : "rgba(0,0,0,1)"};
`;

export const IconWrapper = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
`;
