import styled from "@emotion/styled";

export const EditorBody = styled.div`
    padding: ${({ theme }) => theme.spacing.md};
`;

export const LoadingState = styled.div`
    padding: ${({ theme }) => theme.spacing.md};
    font-family: ${({ theme }) => theme.fonts.ui};
    color: ${({ theme }) => theme.colors.text};
`;

export const NotFoundState = styled.div`
    padding: ${({ theme }) => theme.spacing.md};
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    font-family: ${({ theme }) => theme.fonts.ui};
    color: ${({ theme }) => theme.colors.text};
`;
