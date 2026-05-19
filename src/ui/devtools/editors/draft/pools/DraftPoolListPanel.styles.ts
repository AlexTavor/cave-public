import styled from "@emotion/styled";

export const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

export const PoolList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const PoolRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.surfaceHighlight};
    border-radius: 8px;
`;

export const PoolLabel = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
`;
