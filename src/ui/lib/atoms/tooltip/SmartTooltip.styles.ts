import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const fadeOut = keyframes`
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
`;

export const TooltipContainer = styled.div<{ isVisible: boolean }>`
    position: absolute;
    z-index: ${({ theme }) => theme.zIndices.tooltip};
    pointer-events: auto; /* Enable interaction with tooltip content */

    /* Animation */
    animation: ${({ isVisible }) => (isVisible ? fadeIn : fadeOut)}
        ${({ isVisible }) => (isVisible ? "150ms" : "100ms")} ease-out;
    animation-fill-mode: forwards;
`;
