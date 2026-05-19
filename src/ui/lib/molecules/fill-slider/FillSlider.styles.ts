import styled from "@emotion/styled";

export const FillSliderFrame = styled.div<{
    dragging: boolean;
    shouldPulse: boolean;
}>`
    display: grid;
    gap: ${({ theme }) => theme.spacing.xs};

    ${({ dragging }) =>
        dragging
            ? `
        box-shadow: inset 0 0 18px rgba(255, 193, 7, 0.18);
    `
            : ""}

    ${({ shouldPulse }) =>
        shouldPulse
            ? `
        [data-throttle-pulse="true"] {
            animation: throttlePulse 1.2s ease-in-out infinite;
        }
    `
            : ""}

    @keyframes throttlePulse {
        0%,
        100% {
            opacity: 0.72;
            filter: saturate(0.92);
        }
        50% {
            opacity: 1;
            filter: saturate(1.8) brightness(1.8);
        }
    }
`;

export const FillSliderTrackWrap = styled.div`
    position: relative;
    padding-block: 4px;
`;

export const FillSliderInput = styled.input`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
`;

export const FillSliderHandle = styled.div<{ percent: number }>`
    position: absolute;
    top: 50%;
    left: ${({ percent }) => `${percent}%`};
    width: 18px;
    height: 18px;
    border: ${({ theme }) => theme.borderWidth.thin} solid
        ${({ theme }) => theme.colors.whiteBorderMedium};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.surface};
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.18);
    transform: translate(-50%, -50%);
    pointer-events: none;
`;
