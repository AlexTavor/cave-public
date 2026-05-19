import styled from "@emotion/styled";

export const ChartSurface = styled.div`
    position: relative;
    flex: 1;
    min-height: 0;
    height: 100%;
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.surfaceHighlight};
    padding: ${({ theme }) => theme.spacing.sm};
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

export const ChartSvg = styled.svg`
    width: 100%;
    flex: 1;
    min-height: 0;
    display: block;
`;

export const ChartLegend = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.md};
    font-size: ${({ theme }) => theme.fontSize.sm};
    color: ${({ theme }) => theme.colors.secondary};
    flex-shrink: 0;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

export const ChartEmpty = styled.div`
    color: ${({ theme }) => theme.colors.secondary};
    font-size: ${({ theme }) => theme.fontSize.sm};
    padding: ${({ theme }) => theme.spacing.sm};
`;
