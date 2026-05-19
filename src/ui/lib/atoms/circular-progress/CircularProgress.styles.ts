import styled from "@emotion/styled";

export const SvgContainer = styled.svg`
    transform: rotate(-90deg); // Start from 12 o'clock
    transition: all 0.3s linear;
`;

export const BackgroundCircle = styled.circle`
    fill: none;
    stroke: ${({ theme }) => theme.colors.surfaceHighlight};
`;

export const ProgressCircle = styled.circle<{ progress: number }>`
    fill: none;
    stroke: ${({ theme }) => theme.colors.activity};
`;
