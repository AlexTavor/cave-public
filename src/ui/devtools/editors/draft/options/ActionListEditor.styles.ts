import styled from "@emotion/styled";

export const List = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

export const ActionRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.xs}
        ${({ theme }) => theme.spacing.sm};
    background: ${({ theme }) => theme.colors.surfaceHighlight};
    border-radius: 8px;
`;

export const ActionText = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.primary};
    flex: 1;
`;
