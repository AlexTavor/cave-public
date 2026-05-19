import styled from "@emotion/styled";

export const Bar = styled.div`
    display: flex;
    height: 12px;
    border-radius: 6px;
    overflow: hidden;
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} solid ${theme.colors.whiteBorderSubtle}`};
    background: ${({ theme }) => theme.colors.surface};
`;

export const Segment = styled.div<{ tone: string; width: number }>`
    width: ${({ width }) => width}%;
    background: ${({ theme, tone }) => {
        switch (tone) {
            case "common":
                return theme.colors.success;
            case "rare":
                return theme.colors.selected;
            case "legendary":
                return theme.colors.primary;
            case "none":
                return theme.colors.surfaceHighlight;
            default:
                return theme.colors.secondary;
        }
    }};
`;

export const EmptySegment = styled.div`
    width: 100%;
    background: ${({ theme }) => theme.colors.surfaceHighlight};
`;
