import styled from "@emotion/styled";

const ORGANIC_BAR_EDGE =
    "polygon(0 20%, 7% 6%, 19% 12%, 31% 3%, 46% 11%, 59% 4%, 73% 14%, 87% 6%, 100% 18%, 100% 82%, 92% 96%, 79% 88%, 64% 97%, 49% 90%, 34% 98%, 18% 90%, 6% 97%, 0 84%)";

export const FillBarShell = styled.div`
    display: grid;
    gap: ${({ theme }) => theme.spacing.xs};
`;

export const FillBarMeta = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
    min-height: ${({ theme }) => theme.iconSize.md};
`;

export const FillBarHeading = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    font-size: ${({ theme }) => theme.fontSize.lg};
    color: ${({ theme }) => theme.colors.text};
`;

export const FillBarValue = styled.span`
    font-size: ${({ theme }) => theme.fontSize.lg};
    color: ${({ theme }) => theme.colors.secondary};
    white-space: nowrap;
`;

export const FillBarTrack = styled.div<{ height: string }>`
    position: relative;
    height: ${({ height }) => height};
    overflow: hidden;
    clip-path: ${ORGANIC_BAR_EDGE};
    background:
        radial-gradient(
            circle at 18% 32%,
            rgba(255, 255, 255, 0.12),
            transparent 18%
        ),
        radial-gradient(
            circle at 74% 68%,
            rgba(255, 255, 255, 0.08),
            transparent 16%
        ),
        linear-gradient(180deg, rgba(0, 0, 0, 0.34), rgba(0, 0, 0, 0.18));

    &::after {
        content: "";
        position: absolute;
        inset: 1px;
        clip-path: ${ORGANIC_BAR_EDGE};
        border: 1px solid rgba(255, 255, 255, 0.08);
        pointer-events: none;
    }
`;

export const FillBarBackground = styled.div`
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    clip-path: ${ORGANIC_BAR_EDGE};
    background: rgba(248, 247, 247, 0.12);
`;

export const FillBarFill = styled.div<{ color: string; progress: number }>`
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    clip-path: ${ORGANIC_BAR_EDGE};
    background:
        radial-gradient(
            circle at 12% 34%,
            rgba(255, 255, 255, 0.42),
            transparent 20%
        ),
        radial-gradient(
            circle at 68% 64%,
            rgba(255, 255, 255, 0.42),
            transparent 24%
        ),
        linear-gradient(
            180deg,
            color-mix(in srgb, ${({ color }) => color} 82%, white) 0%,
            ${({ color }) => color} 46%,
            color-mix(in srgb, ${({ color }) => color} 74%, black) 100%
        );
    transform: scaleX(${({ progress }) => progress / 100});
    transform-origin: left center;
    transition: transform 0.18s linear;
`;

export const FillBarThresholdMark = styled.div<{
    color?: string;
    position: number;
}>`
    position: absolute;
    top: 0;
    bottom: 0;
    left: ${({ position }) => position}%;
    width: 2px;
    transform: translateX(-50%);
    background: ${({ color }) => color ?? "rgba(255,255,255,0.72)"};
    pointer-events: none;
`;

