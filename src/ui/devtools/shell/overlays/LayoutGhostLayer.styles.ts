import styled from "@emotion/styled";

export const GhostContainer = styled.div`
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: ${({ theme }) => theme.zIndices.tooltip};
`;

export const CrosshairVertical = styled.div`
    position: absolute;
    top: 0;
    height: 100%;
    width: ${({ theme }) => theme.borderWidth.thin};
    background: ${({ theme }) => theme.colors.severity.info.border};
`;

export const CrosshairHorizontal = styled.div`
    position: absolute;
    left: 0;
    width: 100%;
    height: ${({ theme }) => theme.borderWidth.thin};
    background: ${({ theme }) => theme.colors.severity.info.border};
`;

export const GhostNode = styled.div`
    position: absolute;
    border-radius: ${({ theme }) => theme.radius.round};
    border-style: dashed;
    border-width: ${({ theme }) => theme.borderWidth.thin};
    border-color: ${({ theme }) => theme.colors.severity.danger.border};
    background: ${({ theme }) => theme.colors.severity.info.bg};
    box-shadow: 0 0 ${({ theme }) => theme.spacing.sm}
        ${({ theme }) => theme.colors.severity.info.shadow};
`;
