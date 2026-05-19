import styled from "@emotion/styled";

export const List = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
`;

export const EmptyState = styled.div`
    font-family: ${({ theme }) => theme.fonts.code};
    font-size: 12px;
    color: ${({ theme }) => theme.colors.secondary};
    padding: ${({ theme }) => theme.spacing.sm};
    border: ${({ theme }) =>
        `${theme.borderWidth.thin} dashed ${theme.colors.whiteBorderSubtle}`};
    border-radius: ${({ theme }) => theme.radius.sm};
`;
