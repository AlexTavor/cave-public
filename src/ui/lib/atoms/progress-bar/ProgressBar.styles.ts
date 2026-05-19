import styled from "@emotion/styled";

export const BarContainer = styled.div<{ height: string }>`
    position: relative;
    width: 100%;
    height: ${({ height }) => height};
    background: ${({ theme }) => theme.colors.surface};
    border-radius: ${({ theme }) => theme.radius.sm};
    overflow: hidden;
`;

export const BarFill = styled.div<{
    progress: number;
    color: string;
}>`
    height: 100%;
    width: ${({ progress }) => progress}%;
    background: ${({ color }) => color};
    transition: width 0.3s linear;

    /* Subtle shine effect */
    position: relative;
    &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.15) 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.1) 100%
        );
    }
`;

export const ThresholdTick = styled.div<{ position: number; color?: string }>`
    position: absolute;
    left: ${({ position }) => position}%;
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: ${({ color }) => color || "rgba(255, 255, 255, 0.7)"};
    transform: translateX(-50%); /* Center the tick on the value */
    z-index: 1;
    pointer-events: none;
`;

export const OverlayText = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: ${({ theme }) => theme.fonts.ui};
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text};
    text-shadow: 0 1px 2px black;
    pointer-events: none;
    z-index: 2;
    white-space: nowrap;
`;
